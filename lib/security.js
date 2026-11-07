'use strict';
const crypto = require('node:crypto');
const { db } = require('./db');

/* passwords: scrypt with a random salt */
function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return `s1$${salt.toString('hex')}$${h.toString('hex')}`;
}
function verifyPassword(pw, stored) {
  const [v, s, h] = String(stored).split('$');
  if (v !== 's1' || !s || !h) return false;
  const calc = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(h, 'hex');
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}

/* admin sessions live in the database; only a hash of the token is stored */
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const SESSION_MS = 1000 * 60 * 60 * 12;
function createSession(adminId) {
  const token = crypto.randomBytes(32).toString('hex'), csrf = crypto.randomBytes(24).toString('hex');
  db.prepare('INSERT INTO sessions(token,admin_id,csrf,expires) VALUES(?,?,?,?)').run(sha(token), adminId, csrf, Date.now() + SESSION_MS);
  return token;
}
function getSession(token) {
  if (!token) return null;
  const r = db.prepare('SELECT s.*, a.email FROM sessions s JOIN admins a ON a.id=s.admin_id WHERE s.token=?').get(sha(token));
  if (!r) return null;
  if (r.expires < Date.now()) { db.prepare('DELETE FROM sessions WHERE token=?').run(r.token); return null; }
  return r;
}
function destroySession(token) { if (token) db.prepare('DELETE FROM sessions WHERE token=?').run(sha(token)); }
setInterval(() => db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now()), 3600e3).unref();

/* tiny in-memory rate limiter: n hits per window per key */
const hits = new Map();
function limited(key, n, windowMs) {
  const now = Date.now(), arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  return arr.length > n;
}
setInterval(() => { const now = Date.now(); for (const [k, a] of hits) if (!a.some((t) => now - t < 3600e3)) hits.delete(k); }, 600e3).unref();

/* public forms: double-submit CSRF token in a cookie + hidden field */
function publicCsrf(req, res) {
  let t = req.cookies && req.cookies.akn_csrf;
  if (!t || !/^[a-f0-9]{48}$/.test(t)) {
    t = crypto.randomBytes(24).toString('hex');
    res.cookie('akn_csrf', t, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 6 * 3600e3, path: '/' });
  }
  return t;
}
function checkPublicCsrf(req) {
  const c = req.cookies && req.cookies.akn_csrf, f = req.body && req.body._csrf;
  return !!c && !!f && c.length === f.length && crypto.timingSafeEqual(Buffer.from(c), Buffer.from(String(f)));
}

module.exports = { hashPassword, verifyPassword, createSession, getSession, destroySession, limited, publicCsrf, checkPublicCsrf };
