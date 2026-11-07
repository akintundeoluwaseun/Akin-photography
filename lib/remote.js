'use strict';
/* Keeps the site's data in the GitHub repository, so it works on hosts with a read-only disk (Vercel) with no outside database.

   Everything the owner changes (page text, prices, bookings, messages, photographs, deletions) is saved to a separate branch
   called "data" in the same repository: an encrypted copy of the database plus the resized photographs. Because it is a
   separate branch, saving never rebuilds the website. A fresh server copy restores from that branch before it answers.

   Turned on by setting GITHUB_TOKEN (a token with "Contents: read and write" on the repository). Without it, this file does nothing. */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { DB_FILE, UPLOADS } = require('./paths');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = process.env.GITHUB_REPO || 'akintundeoluwaseun/Akin-photography';
const BRANCH = process.env.GITHUB_DATA_BRANCH || 'data';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
const enabled = !!TOKEN;
const DB_PATH = 'storage/akin.db.enc', UP = 'storage/uploads/';
const MEDIA_RE = /^(\d+)-(480|960|1600|og)\.(webp|jpg)$/;

const state = { head: null, etag: null, lastCheck: 0, files: new Map(), lastError: null, lastSaved: null, dirty: false };

/* ── GitHub calls ── */
async function gh(method, url, body, opts = {}) {
  const res = await fetch(API + url, {
    method,
    headers: { Authorization: 'Bearer ' + TOKEN, Accept: opts.raw ? 'application/vnd.github.raw+json' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'akin-photography-site', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(opts.headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (opts.allow && opts.allow.includes(res.status)) return { status: res.status, res };
  if (!res.ok) { const t = await res.text().catch(() => ''); const e = new Error(`GitHub ${method} ${url} → ${res.status} ${t.slice(0, 160)}`); e.status = res.status; throw e; }
  if (opts.raw) return { status: res.status, buf: Buffer.from(await res.arrayBuffer()), res };
  return { status: res.status, json: res.status === 204 ? null : await res.json(), res };
}

/* ── encryption: customer details never sit in the repository as readable text ── */
const key = () => crypto.createHash('sha256').update(process.env.DATA_KEY ? 'k:' + process.env.DATA_KEY : 'akin-photography:' + TOKEN).digest();
function encrypt(buf) { const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', key(), iv), ct = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]); }
function decrypt(buf) { const d = crypto.createDecipheriv('aes-256-gcm', key(), buf.subarray(0, 12)); d.setAuthTag(buf.subarray(12, 28)); return Buffer.concat([d.update(buf.subarray(28)), d.final()]); }

/* ── reading: bring this server copy up to date ── */
async function readTree(commitSha) {
  const c = (await gh('GET', `/repos/${REPO}/git/commits/${commitSha}`)).json;
  const t = (await gh('GET', `/repos/${REPO}/git/trees/${c.tree.sha}?recursive=1`)).json;
  const files = new Map(); let db = null;
  for (const e of t.tree) { if (e.type !== 'blob') continue; if (e.path === DB_PATH) db = e.sha; else if (e.path.startsWith(UP)) files.set(e.path.slice(UP.length), e.sha); }
  return { treeSha: c.tree.sha, files, db };
}
async function getHead() {
  const r = await gh('GET', `/repos/${REPO}/git/ref/heads/${BRANCH}`, null, { allow: [404, 304], headers: state.etag ? { 'If-None-Match': state.etag } : {} });
  if (r.status === 404) return { missing: true };
  if (r.status === 304) return { same: true };
  state.etag = r.res.headers.get('etag');
  return { sha: r.json.object.sha };
}
async function load(sha) {
  const t = await readTree(sha);
  if (t.db) {
    const raw = (await gh('GET', `/repos/${REPO}/git/blobs/${t.db}`, null, { raw: true })).buf;
    const plain = decrypt(raw);
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    for (const f of ['', '-wal', '-shm']) fs.rmSync(DB_FILE + f, { force: true });
    fs.writeFileSync(DB_FILE, plain);
  }
  state.head = sha; state.files = t.files;
}
/* cold start (before the database is opened) */
async function restore() {
  if (!enabled) return;
  try {
    const h = await getHead();
    if (h.sha) await load(h.sha);
  } catch (e) { state.lastError = e.message; console.error('restore failed:', e.message); }
  state.lastCheck = Date.now();
}
/* while running: another server copy may have saved something newer */
async function refresh(strict) {
  if (!enabled || (strict ? false : Date.now() - state.lastCheck < 30000)) return;
  state.lastCheck = Date.now();
  try {
    const h = await getHead();
    if (h.sha && h.sha !== state.head && !state.dirty) { await load(h.sha); require('./db').reopen(); }
  } catch (e) { state.lastError = e.message; console.error('refresh failed:', e.message); }
}

/* ── writing ── */
let running = null, again = false;
function persist() {
  if (!enabled) return Promise.resolve();
  again = true;
  if (!running) running = (async () => {
    try { while (again) { again = false; await saveOnce(); } } finally { running = null; }
  })();
  return running;
}
async function pool(items, n, fn) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } })); return out; }

async function saveOnce() {
  state.dirty = true;
  try {
    const { db } = require('./db');
    const tmp = path.join(os.tmpdir(), `akin-snap-${process.pid}-${Date.now()}.db`);
    db.exec(`VACUUM INTO '${tmp.replace(/'/g, "''")}'`);
    const snapshot = encrypt(fs.readFileSync(tmp)); fs.rmSync(tmp, { force: true });
    const valid = new Set(db.prepare('SELECT id FROM images').all().map((r) => String(r.id)));

    for (let attempt = 0; ; attempt++) {
      let head = (await getHeadFresh());
      if (head.missing) {
        const base = await gh('GET', `/repos/${REPO}/git/ref/heads/main`, null, { allow: [404] });
        const sha = base.status === 404 ? (await gh('GET', `/repos/${REPO}/git/ref/heads/master`)).json.object.sha : base.json.object.sha;
        await gh('POST', `/repos/${REPO}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha });
        head = { sha };
      }
      const t = await readTree(head.sha);
      const entries = [];
      const add = fs.existsSync(UPLOADS) ? fs.readdirSync(UPLOADS).filter((f) => { const m = MEDIA_RE.exec(f); return m && valid.has(m[1]) && !t.files.has(f); }) : [];
      const blobs = await pool(add, 6, async (f) => ({ f, sha: (await gh('POST', `/repos/${REPO}/git/blobs`, { content: fs.readFileSync(path.join(UPLOADS, f)).toString('base64'), encoding: 'base64' })).json.sha }));
      for (const b of blobs) entries.push({ path: UP + b.f, mode: '100644', type: 'blob', sha: b.sha });
      const gone = [...t.files.keys()].filter((f) => { const m = MEDIA_RE.exec(f); return !m || !valid.has(m[1]); });
      for (const f of gone) entries.push({ path: UP + f, mode: '100644', type: 'blob', sha: null });
      const dbBlob = (await gh('POST', `/repos/${REPO}/git/blobs`, { content: snapshot.toString('base64'), encoding: 'base64' })).json.sha;
      entries.push({ path: DB_PATH, mode: '100644', type: 'blob', sha: dbBlob });
      const tree = (await gh('POST', `/repos/${REPO}/git/trees`, { base_tree: t.treeSha, tree: entries })).json;
      const commit = (await gh('POST', `/repos/${REPO}/git/commits`, { message: 'Site data update', tree: tree.sha, parents: [head.sha] })).json;
      try {
        await gh('PATCH', `/repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
      } catch (e) { if ((e.status === 422 || e.status === 409) && attempt < 2) continue; throw e; }
      state.head = commit.sha; state.etag = null; state.lastSaved = Date.now();
      for (const b of blobs) state.files.set(b.f, b.sha);
      for (const f of gone) state.files.delete(f);
      break;
    }
    state.lastError = null; state.dirty = false;
  } catch (e) { state.lastError = e.message; console.error('save failed:', e.message); }
}
async function getHeadFresh() { state.etag = null; return getHead(); }

/* ── photographs: fetch on demand when this server copy does not have the file yet ── */
const hasFile = (name) => enabled && state.files.has(name);
async function fetchFile(name) {
  const sha = state.files.get(name); if (!sha) return null;
  const p = path.join(UPLOADS, name);
  if (fs.existsSync(p)) return p;
  const buf = (await gh('GET', `/repos/${REPO}/git/blobs/${sha}`, null, { raw: true })).buf;
  fs.mkdirSync(UPLOADS, { recursive: true }); fs.writeFileSync(p, buf);
  return p;
}

/* ── Express glue: look for newer data first, and save before answering when something changed ── */
const SKIP = /^\/(media|css|js|ph|favicon\.svg|og-default\.svg|robots\.txt|admin\/(sw\.js|manifest\.webmanifest|icon-))/;
function middleware(req, res, next) {
  if (!enabled || SKIP.test(req.path)) return next();
  const { changes } = require('./db');
  (async () => {
    await refresh(req.method !== 'GET' && req.method !== 'HEAD' || req.path.startsWith('/admin'));
    const before = changes(); let done = false; const end = res.end.bind(res);
    res.end = function (...a) {
      if (done) return end(...a); done = true;
      if (changes() !== before || state.dirty) { persist().finally(() => end(...a)); return res; }
      return end(...a);
    };
    next();
  })().catch(next);
}

module.exports = { enabled, state, restore, refresh, persist, middleware, hasFile, fetchFile, REPO, BRANCH };
