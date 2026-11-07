'use strict';
const express = require('express');
const multer = require('multer');
const crypto = require('node:crypto');
const { db, settings, setSettings, q } = require('../lib/db');
const { SCHEMA, CATEGORIES } = require('../lib/content');
const sec = require('../lib/security');
const images = require('../lib/images');
const { esc } = require('../lib/ui');
const { STARTER_TITLES } = require('../lib/seed');
const push = require('../lib/push');
const sharp = require('sharp');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 20 } });
const form = express.urlencoded({ extended: false, limit: '200kb' });
const COOKIE = 'akn_admin';
const secure = process.env.NODE_ENV === 'production';

router.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); });

/* ───────── layout: five sidebar tabs, everything else lives in sub-tabs ───────── */
const GROUPS = [
  { id: 'overview', label: 'Overview', items: [['', 'Overview']] },
  { id: 'inbox', label: 'Inbox', items: [['bookings', 'Bookings'], ['bookings/calendar', 'Calendar'], ['enquiries', 'Enquiries']] },
  { id: 'photos', label: 'Photos', items: [['gallery', 'Gallery']] },
  { id: 'website', label: 'Website', items: [['content/home', 'Home page'], ['content/about', 'About page'], ['services', 'Services & prices'], ['testimonials', 'Testimonials'], ['content/seo', 'Search & sharing']] },
  { id: 'settings', label: 'Settings', items: [['settings/business', 'Contact details'], ['hours', 'Opening hours'], ['settings/social', 'Social media'], ['account', 'Account']] },
];
const pill = (key, n) => `<span class="pill" data-pill="${key}" ${n ? '' : 'hidden'}>${n || ''}</span>`;
function counts() { return { b: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status='pending'").get().c, e: db.prepare('SELECT COUNT(*) c FROM enquiries WHERE is_read=0').get().c }; }
function shell(req, title, body, active) {
  const s = req.session, c = counts();
  const flash = req.query.ok ? `<p class="flash ok" role="status">${esc(String(req.query.ok).slice(0, 120))}</p>` : req.query.err ? `<p class="flash bad" role="alert">${esc(String(req.query.err).slice(0, 160))}</p>` : '';
  const group = GROUPS.find((g) => g.items.some(([p]) => p === active)) || GROUPS[0];
  const sub = group.items.length > 1 ? `<nav class="subtabs" aria-label="${esc(group.label)}">${group.items.map(([p, l]) => `<a href="/admin/${p}" ${p === active ? 'aria-current="page"' : ''}>${l}${p === 'bookings' ? pill('b', c.b) : ''}${p === 'enquiries' ? pill('e', c.e) : ''}</a>`).join('')}</nav>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="csrf" content="${s.csrf}">
<title>${esc(title)} · Akin Photography admin</title><link rel="icon" href="/favicon.svg"><link rel="manifest" href="/admin/manifest.webmanifest"><meta name="theme-color" content="#16130f"><link rel="apple-touch-icon" href="/admin/icon-192.png"><link rel="stylesheet" href="/css/admin.css?v=4"></head><body data-total="${c.b + c.e}">
<aside class="side"><a class="logo" href="/admin"><b>AKIN</b> PHOTOGRAPHY<small>Admin</small></a>
<nav class="main-nav" aria-label="Admin">${GROUPS.map((g) => `<a href="/admin/${g.items[0][0]}" ${g === group ? 'aria-current="page"' : ''}>${g.label}${g.id === 'inbox' ? pill('t', c.b + c.e) : ''}</a>`).join('')}</nav>
<div class="side-foot"><button type="button" class="alerts" id="alerts" hidden>🔔 Turn on phone alerts</button><a href="/" target="_blank" rel="noopener">View website ↗</a><form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${s.csrf}"><button>Sign out</button></form></div></aside>
<main class="main">${sub}<h1>${esc(title)}</h1>${flash}${body}</main><script src="/js/admin.js?v=6" defer></script></body></html>`;
}
const csrf = (req) => `<input type="hidden" name="_csrf" value="${req.session.csrf}">`;
const back = (res, to, ok, err) => res.redirect(303, `${to}${to.includes('?') ? '&' : '?'}${err ? 'err=' + encodeURIComponent(err) : 'ok=' + encodeURIComponent(ok || 'Saved')}`);
const fmt = (ms) => new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(new Date(ms));

/* ───────── sign in ───────── */
function loginPage(res, msg, email = '') {
  res.status(msg ? 401 : 200).type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Sign in · Akin Photography</title><link rel="stylesheet" href="/css/admin.css?v=1"></head>
<body class="login"><form class="login-box" method="post" action="/admin/login"><p class="logo"><b>AKIN</b> PHOTOGRAPHY</p><h1>Sign in</h1>${msg ? `<p class="flash bad" role="alert">${esc(msg)}</p>` : ''}
<label>Email<input name="email" type="email" autocomplete="username" required value="${esc(email)}"></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="btn">Sign in</button></form></body></html>`);
}
router.get('/login', (req, res) => { if (sec.getSession(req.cookies[COOKIE])) return res.redirect('/admin'); loginPage(res); });
router.post('/login', form, (req, res) => {
  if (sec.limited('login:' + (req.ip || 'x'), 8, 15 * 60e3)) return loginPage(res.status(429), 'Too many attempts. Please wait 15 minutes.');
  const email = String(req.body.email || '').trim().toLowerCase(), pw = String(req.body.password || '');
  const a = db.prepare('SELECT * FROM admins WHERE email=?').get(email);
  const ok = sec.verifyPassword(pw, a ? a.hash : 's1$00$00') && !!a;
  if (!ok) return loginPage(res, 'Incorrect email or password.', email);
  const token = sec.createSession(a.id);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure, maxAge: 12 * 3600e3, path: '/admin' });
  res.redirect(303, '/admin');
});

/* installable admin app + push service worker: served before sign-in so the browser can always fetch them */
const SW = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('push', (e) => {
  let d = {}; try { d = e.data.json(); } catch (_) { d = { title: 'Akin Photography', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Akin Photography', { body: d.body || '', icon: '/admin/icon-192.png', badge: '/admin/icon-192.png', tag: d.tag || 'akin', renotify: true, data: { url: d.url || '/admin/bookings' } }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/admin';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.indexOf('/admin') !== -1 && 'focus' in c) { if ('navigate' in c) c.navigate(url); return c.focus(); }
    return self.clients.openWindow(url);
  }));
});`;
router.get('/sw.js', (req, res) => { res.type('application/javascript').set({ 'Service-Worker-Allowed': '/admin/', 'Cache-Control': 'no-cache' }).send(SW); });
router.get('/manifest.webmanifest', (req, res) => res.type('application/manifest+json').send(JSON.stringify({ name: 'Akin Photography Admin', short_name: 'Akin Admin', start_url: '/admin/', scope: '/admin/', display: 'standalone', background_color: '#16130f', theme_color: '#16130f', icons: [{ src: '/admin/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/admin/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }] })));
const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0d0c0b"/><circle cx="32" cy="32" r="14" fill="none" stroke="#b08d57" stroke-width="3"/><circle cx="32" cy="32" r="5" fill="#b08d57"/></svg>';
const iconCache = {};
router.get(/^\/icon-(192|512)\.png$/, async (req, res) => {
  const n = Number(req.params[0]);
  iconCache[n] = iconCache[n] || await sharp(Buffer.from(ICON_SVG), { density: 300 }).resize(n, n).png().toBuffer();
  res.type('png').set('Cache-Control', 'public, max-age=86400').send(iconCache[n]);
});

/* everything below needs a signed-in administrator */
router.use((req, res, next) => {
  const s = sec.getSession(req.cookies[COOKIE]);
  if (!s) return res.redirect('/admin/login');
  req.session = s; next();
});
const needCsrf = (req, res, next) => {
  const f = String((req.body && req.body._csrf) || req.headers['x-csrf-token'] || '');
  if (f.length !== req.session.csrf.length || !crypto.timingSafeEqual(Buffer.from(f), Buffer.from(req.session.csrf))) return res.status(403).type('text').send('Security check failed. Go back, reload the page and try again.');
  next();
};
router.post('/logout', form, needCsrf, (req, res) => { sec.destroySession(req.cookies[COOKIE]); res.clearCookie(COOKIE, { path: '/admin' }); res.redirect(303, '/admin/login'); });

/* ───────── overview ───────── */
const todayLagos = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
const waDigits = (p) => require('../lib/ui').digits(p);
const first = (n) => String(n || '').trim().split(/\s+/)[0] || '';
router.get('/', (req, res) => {
  const S = settings();
  const n = (sql) => db.prepare(sql).get().c;
  const c = counts();
  const stats = [['New booking requests', c.b, 'bookings'], ['Unread enquiries', c.e, 'enquiries'], ['Photographs', n('SELECT COUNT(*) c FROM images'), 'gallery'], ['Services shown', n('SELECT COUNT(*) c FROM services WHERE active=1'), 'services']];
  const starter = db.prepare(`SELECT COUNT(*) c FROM images WHERE title IN (${STARTER_TITLES.map(() => '?').join(',')})`).get(...STARTER_TITLES).c;
  let hoursSet = false; try { hoursSet = JSON.parse(S.hours).some((h) => (h.text || '').trim()); } catch { /* */ }
  const socialSet = ['instagram', 'facebook', 'tiktok', 'x', 'youtube'].some((k) => S[k]);
  const list = [
    [!starter, starter ? `Replace the ${starter} starter photograph${starter === 1 ? '' : 's'} with your own work.` : 'Your own photographs are on the site.', 'gallery'],
    [!!waDigits(S.whatsapp), 'Add your WhatsApp number so the WhatsApp buttons and booking messages appear.', 'settings/business'],
    [!!waDigits(S.phone), 'Add your phone number so visitors can call you.', 'settings/business'],
    [q.services().some((s) => s.price), 'Set prices where you want them shown (otherwise services say “Price on request”).', 'services'],
    [hoursSet, 'Add your opening hours.', 'hours'],
    [socialSet, 'Add your social media links.', 'settings/social'],
  ];
  const done = list.filter((x) => x[0]).length;
  const recent = db.prepare("SELECT * FROM bookings WHERE status='pending' ORDER BY id DESC LIMIT 5").all();
  const upcoming = db.prepare("SELECT * FROM bookings WHERE status='confirmed' AND date>=? ORDER BY date,time LIMIT 5").all(todayLagos());
  const rows = (arr, empty) => arr.length ? `<ul class="rows">${arr.map((b) => `<li><a href="/admin/bookings?open=${b.id}"><b>${esc(b.name)}</b><span>${esc(b.service_name)}</span><span>${esc(b.date)} · ${esc(b.time)}</span></a></li>`).join('')}</ul>` : `<p class="muted">${empty}</p>`;
  const body = `<div class="stats">${stats.map(([l, v, p]) => `<a class="stat" href="/admin/${p}"><b>${v}</b><span>${l}</span></a>`).join('')}</div>
<div class="cols"><section class="card"><h2>Waiting for a reply</h2>${rows(recent, 'No new booking requests.')}</section>
<section class="card"><h2>Coming up</h2>${rows(upcoming, 'No confirmed sessions yet.')}</section></div>
<section class="card" id="push-card"><h2>Alerts on this device</h2><p class="muted" id="push-msg">Checking…</p><div class="row"><button type="button" class="btn small" id="push-on" hidden>Turn on alerts</button><button type="button" class="btn small ghost" id="push-test" hidden>Send a test alert</button></div>
<details class="how"><summary>How to get alerts when the app is closed</summary><ol><li><b>Android:</b> open this admin in Chrome, tap the ⋮ menu, choose <i>Install app</i> (or <i>Add to Home screen</i>), open it, then tap <i>Turn on alerts</i>.</li><li><b>iPhone:</b> open this admin in Safari, tap Share, choose <i>Add to Home Screen</i>, open it from your home screen, then tap <i>Turn on alerts</i>.</li><li><b>Computer:</b> tap <i>Turn on alerts</i>. They arrive while the browser is running in the background.</li><li>Alerts need the site to be on a secure (https) address, which every normal host provides. Do each step once on each device you want alerts on.</li></ol></details></section>
<section class="card"><h2>Setting up <span class="muted">${done} of ${list.length} done</span></h2><div class="bar"><i style="width:${Math.round((done / list.length) * 100)}%"></i></div><ul class="checks">${list.map(([ok, t, p]) => `<li class="${ok ? 'ok' : ''}"><span aria-hidden="true">${ok ? '✓' : '○'}</span>${ok ? `<span>${esc(t)}</span>` : `<a href="/admin/${p}">${esc(t)}</a>`}</li>`).join('')}</ul></section>`;
  res.type('html').send(shell(req, 'Overview', body, ''));
});
router.get('/api/counts', (req, res) => res.json(counts()));
router.get('/push/key', (req, res) => res.json({ key: push.publicKey(), devices: push.count() }));
router.post('/push/subscribe', express.json({ limit: '8kb' }), needCsrf, (req, res) => res.status(push.save(req.body) ? 200 : 400).json({ ok: push.count() > 0 }));
router.post('/push/unsubscribe', express.json({ limit: '8kb' }), needCsrf, (req, res) => { push.remove(req.body && req.body.endpoint); res.json({ ok: true }); });
router.post('/push/test', express.json({ limit: '2kb' }), needCsrf, async (req, res) => { const n = await push.notifyAll({ title: 'Test alert', body: 'Alerts are working on this device.', url: '/admin', tag: 'test' }); res.json({ sent: n, devices: push.count() }); });

/* ───────── bookings ───────── */
const STATUSES = ['pending', 'confirmed', 'completed', 'declined'];
const likeEsc = (s) => '%' + s.replace(/[\\%_]/g, '\\$&') + '%';
function waReplies(b) {
  const d = waDigits(b.phone); if (!d) return '';
  const nm = first(b.name), when = `${b.date} at ${b.time}`;
  const msgs = [
    ['Confirm', `Hello ${nm}, this is Akin Photography. Your booking request ${b.ref} for ${b.service_name} on ${when} is confirmed. We look forward to seeing you.`],
    ['Suggest another time', `Hello ${nm}, this is Akin Photography. Thank you for your request ${b.ref} for ${b.service_name}. We are not available on ${when}. Could we do another day or time?`],
    ['Ask for details', `Hello ${nm}, this is Akin Photography. Thank you for your request ${b.ref} for ${b.service_name} on ${when}. Could you tell us a little more about what you have in mind?`],
    ['Message', `Hello ${nm}, this is Akin Photography. Regarding your request ${b.ref}: `],
  ];
  return `<div class="replies"><span class="muted">Reply on WhatsApp:</span>${msgs.map(([l, m]) => `<a class="btn small ghost" href="https://wa.me/${d}?text=${encodeURIComponent(m)}" target="_blank" rel="noopener">${l}</a>`).join('')}</div>`;
}
router.get('/bookings', (req, res) => {
  const st = STATUSES.includes(req.query.status) ? req.query.status : '';
  const term = String(req.query.q || '').trim().slice(0, 60), openId = Number(req.query.open) || 0;
  const where = [], args = [];
  if (st) { where.push('status=?'); args.push(st); }
  if (term) { where.push("(name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR ref LIKE ? ESCAPE '\\' OR service_name LIKE ? ESCAPE '\\')"); const l = likeEsc(term); args.push(l, l, l, l); }
  const rows = db.prepare(`SELECT * FROM bookings ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, id DESC LIMIT 200`).all(...args);
  const cnt = Object.fromEntries(db.prepare('SELECT status, COUNT(*) c FROM bookings GROUP BY status').all().map((r) => [r.status, r.c]));
  const total = Object.values(cnt).reduce((a, b) => a + b, 0);
  const href = (s) => `/admin/bookings?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(term ? { q: term } : {}) })}`;
  const item = (b) => `<details class="card bk ${b.status === 'pending' ? 'new' : ''}" ${b.id === openId || rows.length === 1 && term ? 'open' : ''}>
<summary><span class="who">${esc(b.name)}</span><span class="what">${esc(b.service_name)}</span><span class="when">${esc(b.date)} · ${esc(b.time)}</span><span class="tag ${b.status}">${b.status}</span></summary>
<dl class="kv"><div><dt>Reference</dt><dd>${esc(b.ref)}</dd></div><div><dt>Received</dt><dd>${fmt(b.created)}</dd></div><div><dt>Where</dt><dd>${b.mode === 'mobile' ? 'Mobile: ' + esc(b.location) : 'Studio'}</dd></div><div><dt>Phone</dt><dd><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a></dd></div></dl>
${b.details ? `<p class="detail">${esc(b.details)}</p>` : ''}${waReplies(b)}
<form class="inline" method="post" action="/admin/bookings/${b.id}">${csrf(req)}<label>Status<select name="status">${STATUSES.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="grow">Private note<input name="note" maxlength="500" value="${esc(b.note)}"></label><button class="btn">Save</button></form>
<form method="post" action="/admin/bookings/${b.id}/delete" data-confirm="Delete this booking request?">${csrf(req)}<button class="link-danger">Delete</button></form></details>`;
  const body = `<form class="search" method="get" action="/admin/bookings" role="search">${st ? `<input type="hidden" name="status" value="${st}">` : ''}<input type="search" name="q" value="${esc(term)}" placeholder="Search name, phone, reference or service" aria-label="Search bookings"><button class="btn">Search</button>${term ? `<a class="btn ghost" href="${href(st)}">Clear</a>` : ''}</form>
<p class="tabs">${[['', 'All', total], ...STATUSES.map((s) => [s, s, cnt[s] || 0])].map(([s, l, n]) => `<a href="${href(s)}" ${s === st ? 'aria-current="true"' : ''}>${l} <small>${n}</small></a>`).join('')}</p>
${rows.length ? rows.map(item).join('') : `<p class="muted">${term || st ? 'No bookings match.' : 'No booking requests yet. They will appear here, and you will get an alert if you turned alerts on.'}</p>`}`;
  res.type('html').send(shell(req, 'Bookings', body, 'bookings'));
});
router.get('/bookings/calendar', (req, res) => {
  const today = todayLagos(), mm = /^\d{4}-(0[1-9]|1[0-2])$/.test(String(req.query.m || '')) ? req.query.m : today.slice(0, 7);
  const [y, m] = mm.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate(), lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const by = {};
  for (const b of db.prepare("SELECT * FROM bookings WHERE date LIKE ? AND status!='declined' ORDER BY time").all(`${mm}-%`)) (by[b.date] = by[b.date] || []).push(b);
  const shift = (d) => { const t = new Date(Date.UTC(y, m - 1 + d, 1)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}`; };
  const label = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 1)));
  const cells = [...Array(lead).fill('<div class="day empty"></div>'), ...Array.from({ length: days }, (_, i) => {
    const d = `${mm}-${String(i + 1).padStart(2, '0')}`, ev = by[d] || [];
    return `<div class="day ${d === today ? 'today' : ''} ${ev.length ? 'has' : ''}"><b>${i + 1}</b>${ev.map((b) => `<a class="ev ${b.status}" href="/admin/bookings?open=${b.id}" title="${esc(b.service_name)}">${esc(b.time)} ${esc(first(b.name))}</a>`).join('')}</div>`;
  })].join('');
  const body = `<div class="cal-head"><a class="btn small ghost" href="/admin/bookings/calendar?m=${shift(-1)}">← Previous</a><h2>${label}</h2><a class="btn small ghost" href="/admin/bookings/calendar?m=${shift(1)}">Next →</a>${mm !== today.slice(0, 7) ? `<a class="btn small ghost" href="/admin/bookings/calendar">Today</a>` : ''}</div>
<div class="cal"><div class="dow">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span>${d}</span>`).join('')}</div><div class="days">${cells}</div></div>
<p class="muted legend"><span class="ev pending">Waiting</span> <span class="ev confirmed">Confirmed</span> <span class="ev completed">Done</span> Declined requests are hidden.</p>`;
  res.type('html').send(shell(req, 'Calendar', body, 'bookings/calendar'));
});
router.post('/bookings/:id', form, needCsrf, (req, res) => {
  const st = STATUSES.includes(req.body.status) ? req.body.status : 'pending';
  db.prepare('UPDATE bookings SET status=?, note=? WHERE id=?').run(st, String(req.body.note || '').slice(0, 500), Number(req.params.id));
  back(res, `/admin/bookings?open=${Number(req.params.id)}`, 'Booking updated');
});
router.post('/bookings/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM bookings WHERE id=?').run(Number(req.params.id)); back(res, '/admin/bookings', 'Booking deleted'); });

/* ───────── enquiries ───────── */
router.get('/enquiries', (req, res) => {
  const term = String(req.query.q || '').trim().slice(0, 60), unread = req.query.show === 'unread';
  const where = [], args = [];
  if (unread) where.push('is_read=0');
  if (term) { where.push("(name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR message LIKE ? ESCAPE '\\')"); const l = likeEsc(term); args.push(l, l, l, l); }
  const rows = db.prepare(`SELECT * FROM enquiries ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT 200`).all(...args);
  const all = db.prepare('SELECT COUNT(*) c FROM enquiries').get().c, un = counts().e;
  const card = (e) => { const d = waDigits(e.phone); const msg = `Hello ${first(e.name)}, this is Akin Photography. Thank you for your message. `;
    return `<article class="card enq ${e.is_read ? '' : 'unread'}"><header><h2>${esc(e.name)} ${e.is_read ? '' : '<span class="tag pending">new</span>'}</h2><span class="muted">${fmt(e.created)}</span></header>
<p class="detail">${esc(e.message)}</p>
<div class="row">${d ? `<a class="btn small ghost" href="https://wa.me/${d}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Reply on WhatsApp</a>` : ''}${e.phone ? `<a class="btn small ghost" href="tel:${esc(e.phone)}">Call ${esc(e.phone)}</a>` : ''}${e.email ? `<a class="btn small ghost" href="mailto:${esc(e.email)}?subject=${encodeURIComponent('Your message to Akin Photography')}">Email ${esc(e.email)}</a>` : ''}
<form method="post" action="/admin/enquiries/${e.id}/read">${csrf(req)}<button class="btn small">${e.is_read ? 'Mark unread' : 'Mark read'}</button></form><form method="post" action="/admin/enquiries/${e.id}/delete" data-confirm="Delete this enquiry?">${csrf(req)}<button class="link-danger">Delete</button></form></div></article>`; };
  const body = `<form class="search" method="get" action="/admin/enquiries" role="search">${unread ? '<input type="hidden" name="show" value="unread">' : ''}<input type="search" name="q" value="${esc(term)}" placeholder="Search enquiries" aria-label="Search enquiries"><button class="btn">Search</button></form>
<p class="tabs"><a href="/admin/enquiries${term ? '?q=' + encodeURIComponent(term) : ''}" ${unread ? '' : 'aria-current="true"'}>All <small>${all}</small></a><a href="/admin/enquiries?show=unread${term ? '&q=' + encodeURIComponent(term) : ''}" ${unread ? 'aria-current="true"' : ''}>Unread <small>${un}</small></a></p>
${rows.length ? rows.map(card).join('') : '<p class="muted">Nothing here.</p>'}`;
  res.type('html').send(shell(req, 'Enquiries', body, 'enquiries'));
});
router.post('/enquiries/:id/read', form, needCsrf, (req, res) => { db.prepare('UPDATE enquiries SET is_read = 1 - is_read WHERE id=?').run(Number(req.params.id)); back(res, '/admin/enquiries', 'Updated'); });
router.post('/enquiries/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM enquiries WHERE id=?').run(Number(req.params.id)); back(res, '/admin/enquiries', 'Deleted'); });

/* ───────── gallery ───────── */
const catOpts = (sel) => CATEGORIES.map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('');
function removeImage(id) {
  const S = settings();
  db.prepare('DELETE FROM images WHERE id=?').run(id); db.prepare('UPDATE services SET image_id=NULL WHERE image_id=?').run(id); images.removeFiles(id);
  const clear = {}; for (const k of ['hero_image', 'about_image', 'cta_image']) if (String(S[k]) === String(id)) clear[k] = '';
  if (Object.keys(clear).length) setSettings(clear);
}
const idList = (v) => [...new Set([].concat(v || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
router.get('/gallery', (req, res) => {
  const S = settings(), imgs = q.images(), svcs = q.services(true);
  const roles = (id) => [String(S.hero_image) === String(id) && 'Home hero', String(S.about_image) === String(id) && 'About page', String(S.cta_image) === String(id) && 'Banner', ...svcs.filter((s) => s.image_id === id).map((s) => s.name)].filter(Boolean);
  const card = (i) => `<article class="ph" draggable="true" data-id="${i.id}">
<label class="sel"><input type="checkbox" class="pick" name="ids" value="${i.id}" form="bulk" aria-label="Select photograph ${i.id}"></label>
<img src="/media/${i.id}-480.webp" alt="${esc(i.title)}" loading="lazy" width="${i.w}" height="${i.h}" draggable="false">
<div class="badges">${roles(i.id).map((r) => `<span>${esc(r)}</span>`).join('')}${i.featured ? '<span class="home">On home page</span>' : ''}</div>
<div class="ph-meta"><span>${esc(i.category)}</span><span class="moves"><button type="button" class="mv" data-d="-1" aria-label="Move earlier">←</button><button type="button" class="mv" data-d="1" aria-label="Move later">→</button></span></div>
<details><summary>Edit</summary>
<form method="post" action="/admin/gallery/${i.id}">${csrf(req)}<label>Category<select name="category">${catOpts(i.category)}</select></label><label>Caption (describe the photo)<input name="title" maxlength="140" value="${esc(i.title)}"></label><label class="check"><input type="checkbox" name="featured" ${i.featured ? 'checked' : ''}> Show on home page</label><button class="btn small">Save</button></form>
<form method="post" action="/admin/gallery/${i.id}/use">${csrf(req)}<label>Use this photo as<select name="as"><option value="hero_image">Home page hero</option><option value="about_image">About page photo</option><option value="cta_image">Home page banner</option>${svcs.map((s) => `<option value="svc:${s.id}">Service: ${esc(s.name)}</option>`).join('')}</select></label><button class="btn small ghost">Use here</button></form>
<form method="post" action="/admin/gallery/${i.id}/delete" data-confirm="Delete this photograph for good?">${csrf(req)}<button class="link-danger">Delete photo</button></form></details></article>`;
  const body = `<section class="card"><h2>Add photographs</h2>
<form class="upload" method="post" action="/admin/gallery/upload" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="${req.session.csrf}">
<label>Category<select name="category">${catOpts('portraits')}</select></label><label class="grow">Photographs (JPG, PNG or WebP, up to 20 at a time)<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required></label><button class="btn">Upload</button></form></section>
${imgs.length ? `<p class="muted tip">Drag photos to reorder them (or use the arrows on a phone). Tick photos to change several at once. Open <b>Edit</b> to set a caption or choose where a photo is used.</p>
<div class="grid ph-grid" id="ph-grid">${imgs.map(card).join('')}</div>
<form id="bulk" class="bulkbar" method="post" action="/admin/gallery/bulk" hidden>${csrf(req)}<b><span id="bulk-n">0</span> selected</b><button type="button" class="btn small ghost" id="sel-all">Select all</button><button type="button" class="btn small ghost" id="sel-none">Clear</button>
<select name="category" aria-label="Category">${catOpts('')}</select><button class="btn small" name="action" value="category">Move to category</button><button class="btn small ghost" name="action" value="feature">Show on home</button><button class="btn small ghost" name="action" value="unfeature">Hide from home</button><button class="btn small danger" name="action" value="delete" data-confirm-btn="Delete the selected photographs for good?">Delete</button></form>` : '<p class="muted">No photographs yet. The public gallery shows sample tiles until you upload.</p>'}`;
  res.type('html').send(shell(req, 'Gallery', body, 'gallery'));
});
router.post('/gallery/upload', upload.array('photos', 20), needCsrf, async (req, res) => {
  const cat = CATEGORIES.includes(req.body.category) ? req.body.category : 'other';
  let ok = 0, bad = 0;
  for (const f of req.files || []) {
    const r = db.prepare('INSERT INTO images(category,w,h,created,sort) VALUES (?,?,?,?,0)').run(cat, 0, 0, Date.now());
    const id = Number(r.lastInsertRowid);
    try { const { w, h } = await images.processUpload(id, f.buffer); db.prepare('UPDATE images SET w=?,h=? WHERE id=?').run(w, h, id); ok++; }
    catch { db.prepare('DELETE FROM images WHERE id=?').run(id); images.removeFiles(id); bad++; }
  }
  back(res, '/admin/gallery', bad ? '' : `${ok} photograph${ok === 1 ? '' : 's'} uploaded`, bad ? `${ok} uploaded, ${bad} could not be read. Use JPG, PNG or WebP.` : '');
});
router.post('/gallery/bulk', form, needCsrf, (req, res) => {
  const ids = idList(req.body.ids), act = String(req.body.action || '');
  if (!ids.length) return back(res, '/admin/gallery', '', 'Tick at least one photograph first.');
  db.transaction(() => {
    for (const id of ids) {
      if (act === 'delete') removeImage(id);
      else if (act === 'category' && CATEGORIES.includes(req.body.category)) db.prepare('UPDATE images SET category=? WHERE id=?').run(req.body.category, id);
      else if (act === 'feature' || act === 'unfeature') db.prepare('UPDATE images SET featured=? WHERE id=?').run(act === 'feature' ? 1 : 0, id);
    }
  })();
  const msg = { delete: 'deleted', category: 'moved', feature: 'now on the home page', unfeature: 'removed from the home page' }[act];
  if (!msg) return back(res, '/admin/gallery', '', 'Choose what to do with the selected photographs.');
  back(res, '/admin/gallery', `${ids.length} photograph${ids.length === 1 ? '' : 's'} ${msg}`);
});
router.post('/gallery/reorder', express.json({ limit: '30kb' }), needCsrf, (req, res) => {
  const ids = idList(req.body && req.body.ids);
  db.transaction(() => ids.forEach((id, i) => db.prepare('UPDATE images SET sort=? WHERE id=?').run(i + 1, id)))();
  res.status(204).end();
});
router.post('/gallery/:id', form, needCsrf, (req, res) => {
  const b = req.body, cat = CATEGORIES.includes(b.category) ? b.category : 'other';
  db.prepare('UPDATE images SET category=?,title=?,featured=? WHERE id=?').run(cat, String(b.title || '').slice(0, 140), b.featured ? 1 : 0, Number(req.params.id));
  back(res, '/admin/gallery', 'Photograph saved');
});
router.post('/gallery/:id/use', form, needCsrf, (req, res) => {
  const id = Number(req.params.id), as = String(req.body.as || '');
  if (!q.image(id)) return back(res, '/admin/gallery', '', 'That photograph no longer exists.');
  if (['hero_image', 'about_image', 'cta_image'].includes(as)) setSettings({ [as]: String(id) });
  else if (/^svc:\d+$/.test(as)) db.prepare('UPDATE services SET image_id=? WHERE id=?').run(id, Number(as.slice(4)));
  else return back(res, '/admin/gallery', '', 'Choose where to use the photograph.');
  back(res, '/admin/gallery', 'Photograph placed on the website');
});
router.post('/gallery/:id/delete', form, needCsrf, (req, res) => { removeImage(Number(req.params.id)); back(res, '/admin/gallery', 'Photograph deleted'); });

/* ───────── services ───────── */
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'service';
function svcForm(req, s) {
  const imgs = q.images();
  return `<form class="svc-form" method="post" action="/admin/services/${s ? s.id : 'new'}">${csrf(req)}
<label>Name<input name="name" required maxlength="80" value="${esc(s ? s.name : '')}"></label>
<label>Description<textarea name="desc" rows="3" maxlength="500">${esc(s ? s.description : '')}</textarea></label>
<div class="three"><label>Price type<select name="price_mode">${[['quote', 'Price on request'], ['fixed', 'Fixed price'], ['from', 'Starting from']].map(([v, l]) => `<option value="${v}" ${s && s.price_mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
<label>Price (₦, numbers only)<input name="price" inputmode="numeric" pattern="[0-9]*" maxlength="9" value="${s && s.price ? s.price : ''}"></label><label class="check"><input type="checkbox" name="negotiable" ${s && s.negotiable ? 'checked' : ''}> Negotiable</label></div>
<div class="three"><label>Gallery category<select name="category">${catOpts(s ? s.category : 'other')}</select></label>
<label>Photo for this service<select name="image_id"><option value="">Automatic</option>${imgs.map((i) => `<option value="${i.id}" ${s && s.image_id === i.id ? 'selected' : ''}>#${i.id} · ${i.category}${i.title ? ' · ' + esc(i.title) : ''}</option>`).join('')}</select></label>
<label>Order<input type="number" name="sort" value="${s ? s.sort : 99}" min="0" max="999"></label></div>
<label class="check"><input type="checkbox" name="active" ${!s || s.active ? 'checked' : ''}> Show on the website</label>
<button class="btn">${s ? 'Save service' : 'Add service'}</button></form>`;
}
router.get('/services', (req, res) => {
  const body = `<p class="muted">Prices stay empty until you set them. “Price on request” is shown for any service without one.</p>
${q.services(true).map((s) => `<details class="card" ${req.query.open == s.id ? 'open' : ''}><summary><b>${esc(s.name)}</b> ${s.active ? '' : '<span class="tag declined">hidden</span>'} <span class="muted">${s.price && s.price_mode !== 'quote' ? '₦' + s.price.toLocaleString('en-NG') : 'Price on request'}</span></summary>${svcForm(req, s)}<form method="post" action="/admin/services/${s.id}/delete" data-confirm="Delete this service?">${csrf(req)}<button class="link-danger">Delete service</button></form></details>`).join('')}
<details class="card"><summary><b>+ Add a service</b></summary>${svcForm(req, null)}</details>`;
  res.type('html').send(shell(req, 'Services & prices', body, 'services'));
});
function svcSave(req) {
  const b = req.body, mode = ['quote', 'fixed', 'from'].includes(b.price_mode) ? b.price_mode : 'quote';
  const price = /^\d{1,9}$/.test(String(b.price || '').trim()) ? Number(b.price) : null;
  return { name: String(b.name || '').trim().slice(0, 80), description: String(b.desc || '').slice(0, 500),
    category: CATEGORIES.includes(b.category) ? b.category : 'other', price: mode === 'quote' ? null : price, price_mode: mode === 'quote' || !price ? 'quote' : mode, negotiable: b.negotiable ? 1 : 0,
    image_id: /^\d+$/.test(b.image_id || '') && q.image(Number(b.image_id)) ? Number(b.image_id) : null, sort: Math.max(0, Math.min(999, parseInt(b.sort, 10) || 0)), active: b.active ? 1 : 0 };
}
router.post('/services/new', form, needCsrf, (req, res) => {
  const v = svcSave(req); if (!v.name) return back(res, '/admin/services', '', 'A service needs a name.');
  let slug = slugify(v.name); while (db.prepare('SELECT 1 FROM services WHERE slug=?').get(slug)) slug += '-' + crypto.randomInt(10, 99);
  db.prepare('INSERT INTO services(slug,name,description,category,price,price_mode,negotiable,image_id,sort,active) VALUES (@slug,@name,@description,@category,@price,@price_mode,@negotiable,@image_id,@sort,@active)').run({ ...v, slug });
  back(res, '/admin/services', 'Service added');
});
router.post('/services/:id', form, needCsrf, (req, res) => {
  const v = svcSave(req); if (!v.name) return back(res, '/admin/services', '', 'A service needs a name.');
  db.prepare('UPDATE services SET name=@name,description=@description,category=@category,price=@price,price_mode=@price_mode,negotiable=@negotiable,image_id=@image_id,sort=@sort,active=@active WHERE id=@id').run({ ...v, id: Number(req.params.id) });
  back(res, `/admin/services?open=${Number(req.params.id)}`, 'Service saved');
});
router.post('/services/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM services WHERE id=?').run(Number(req.params.id)); back(res, '/admin/services', 'Service deleted'); });

/* ───────── testimonials ───────── */
function tForm(req, t) {
  return `<form class="svc-form" method="post" action="/admin/testimonials/${t ? t.id : 'new'}">${csrf(req)}<div class="two"><label>Customer name<input name="name" required maxlength="80" value="${esc(t ? t.name : '')}"></label><label>Detail (optional, e.g. “Wedding client”)<input name="role" maxlength="80" value="${esc(t ? t.role : '')}"></label></div>
<div class="two"><label>What they said<textarea name="text" rows="3" required maxlength="600">${esc(t ? t.text : '')}</textarea></label></div>
<div class="two"><label>Order<input type="number" name="sort" value="${t ? t.sort : 0}"></label><label class="check"><input type="checkbox" name="active" ${!t || t.active ? 'checked' : ''}> Show on the website</label></div><button class="btn">${t ? 'Save' : 'Add testimonial'}</button></form>`;
}
router.get('/testimonials', (req, res) => {
  const body = `<p class="muted">Only add words your real customers have given you, with their permission. The testimonials section stays hidden on the website until you add one.</p>
${q.testimonials(true).map((t) => `<details class="card"><summary><b>${esc(t.name)}</b> ${t.active ? '' : '<span class="tag declined">hidden</span>'}</summary>${tForm(req, t)}<form method="post" action="/admin/testimonials/${t.id}/delete" data-confirm="Delete this testimonial?">${csrf(req)}<button class="link-danger">Delete</button></form></details>`).join('')}
<details class="card" open><summary><b>+ Add a testimonial</b></summary>${tForm(req, null)}</details>`;
  res.type('html').send(shell(req, 'Testimonials', body, 'testimonials'));
});
const tSave = (b) => ({ name: String(b.name || '').trim().slice(0, 80), role: String(b.role || '').trim().slice(0, 80), text: String(b.text || '').trim().slice(0, 600), sort: parseInt(b.sort, 10) || 0, active: b.active ? 1 : 0 });
router.post('/testimonials/new', form, needCsrf, (req, res) => { const v = tSave(req.body); if (!v.name || !v.text) return back(res, '/admin/testimonials', '', 'Name and testimonial text are required.'); db.prepare('INSERT INTO testimonials(name,role,text,sort,active) VALUES (@name,@role,@text,@sort,@active)').run(v); back(res, '/admin/testimonials', 'Testimonial added'); });
router.post('/testimonials/:id', form, needCsrf, (req, res) => { const v = tSave(req.body); if (!v.name || !v.text) return back(res, '/admin/testimonials', '', 'Name and testimonial text are required.'); db.prepare('UPDATE testimonials SET name=@name,role=@role,text=@text,sort=@sort,active=@active WHERE id=@id').run({ ...v, id: Number(req.params.id) }); back(res, '/admin/testimonials', 'Testimonial saved'); });
router.post('/testimonials/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM testimonials WHERE id=?').run(Number(req.params.id)); back(res, '/admin/testimonials', 'Deleted'); });

/* ───────── content & settings (driven by the schema) ───────── */
function fieldHtml(f, S, req) {
  const inp = (name, label, v) => {
    const l = esc(label);
    if (f.type === 'textarea') return `<label>${l}<textarea name="${name}" rows="4" maxlength="1500">${esc(v)}</textarea></label>`;
    if (f.type === 'image') { const imgs = q.images(); return `<label>${l}<select name="${name}"><option value="">None (use a sample tile)</option>${imgs.map((i) => `<option value="${i.id}" ${String(v) === String(i.id) ? 'selected' : ''}>#${i.id} · ${i.category}${i.title ? ' · ' + esc(i.title) : ''}</option>`).join('')}</select></label>`; }
    return `<label>${l}<input name="${name}" type="${f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}" maxlength="400" value="${esc(v)}"></label>`;
  };
  return `<div class="fld">${inp(f.k, f.label, S[f.k])}${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
}
function schemaPage(kind) {
  return (req, res, next) => {
    const g = SCHEMA.find((x) => x.id === req.params.group);
    if (!g || (kind === 'settings') !== ['business', 'social'].includes(g.id)) return next();
    const S = settings();
    const body = `<p class="muted">${esc(g.note || '')}</p><form class="card settings" method="post" action="/admin/${kind}/${g.id}">${csrf(req)}${g.fields.map((f) => fieldHtml(f, S, req)).join('')}<button class="btn">Save changes</button></form>`;
    res.type('html').send(shell(req, g.title, body, `${kind}/${g.id}`));
  };
}
function schemaSave(kind) {
  return (req, res, next) => {
    const g = SCHEMA.find((x) => x.id === req.params.group);
    if (!g || (kind === 'settings') !== ['business', 'social'].includes(g.id)) return next();
    const out = {};
    for (const f of g.fields) for (const k of [f.k]) {
      let v = String(req.body[k] ?? '').trim();
      if (f.type === 'url' && v && !/^https?:\/\//i.test(v)) return back(res, `/admin/${kind}/${g.id}`, '', `${f.label} must start with https://`);
      if (f.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return back(res, `/admin/${kind}/${g.id}`, '', 'That email address does not look right.');
      if (k === 'whatsapp' && v && !require('../lib/ui').digits(v)) return back(res, `/admin/${kind}/${g.id}`, '', 'The WhatsApp number must be in international format, e.g. +2348000000000.');
      if (k === 'phone' && v && !require('../lib/ui').digits(v)) return back(res, `/admin/${kind}/${g.id}`, '', 'That phone number does not look right.');
      if (k === 'time_slots' && !v.split(',').some((x) => /^\d{1,2}:\d{2}$/.test(x.trim()))) return back(res, `/admin/${kind}/${g.id}`, '', 'Enter times like 09:00, 10:30');
      if (k === 'address' && !v) v = settings().address;
      out[k] = v;
    }
    setSettings(out); back(res, `/admin/${kind}/${g.id}`, 'Saved');
  };
}
router.get('/content/:group', schemaPage('content')); router.post('/content/:group', form, needCsrf, schemaSave('content'));
router.get('/settings/:group', schemaPage('settings')); router.post('/settings/:group', form, needCsrf, schemaSave('settings'));

router.get('/hours', (req, res) => {
  let h = []; try { h = JSON.parse(settings().hours); } catch { /* */ }
  const names = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
  const body = `<p class="muted">Write the hours for each day, for example “9:00 am – 6:00 pm”, or leave a day empty to show “Closed”. If every day is empty, the opening hours section is hidden.</p>
<form class="card settings" method="post" action="/admin/hours">${csrf(req)}${Object.keys(names).map((d) => `<label>${names[d]}<input name="${d}" maxlength="60" value="${esc((h.find((x) => x.day === d) || {}).text || '')}"></label>`).join('')}<button class="btn">Save hours</button></form>`;
  res.type('html').send(shell(req, 'Opening hours', body, 'hours'));
});
router.post('/hours', form, needCsrf, (req, res) => { setSettings({ hours: JSON.stringify(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => ({ day: d, text: String(req.body[d] || '').trim().slice(0, 60) }))) }); back(res, '/admin/hours', 'Hours saved'); });

/* ───────── account ───────── */
router.get('/account', (req, res) => {
  const body = `<form class="card settings" method="post" action="/admin/account">${csrf(req)}<p class="muted">Signed in as <b>${esc(req.session.email)}</b></p>
<label>Email address<input name="email" type="email" required value="${esc(req.session.email)}"></label><label>Current password<input name="current" type="password" autocomplete="current-password" required></label>
<label>New password (leave empty to keep the current one)<input name="password" type="password" autocomplete="new-password" minlength="10"></label><p class="help">At least 10 characters.</p><button class="btn">Save</button></form>`;
  res.type('html').send(shell(req, 'Account', body, 'account'));
});
router.post('/account', form, needCsrf, (req, res) => {
  const a = db.prepare('SELECT * FROM admins WHERE id=?').get(req.session.admin_id);
  if (!sec.verifyPassword(String(req.body.current || ''), a.hash)) return back(res, '/admin/account', '', 'The current password is not correct.');
  const email = String(req.body.email || '').trim().toLowerCase(), pw = String(req.body.password || '');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return back(res, '/admin/account', '', 'That email address does not look right.');
  if (pw && pw.length < 10) return back(res, '/admin/account', '', 'The new password needs at least 10 characters.');
  db.prepare('UPDATE admins SET email=?' + (pw ? ', hash=?' : '') + ' WHERE id=?').run(...(pw ? [email, sec.hashPassword(pw), a.id] : [email, a.id]));
  if (pw) db.prepare('DELETE FROM sessions WHERE admin_id=? AND token!=?').run(a.id, crypto.createHash('sha256').update(req.cookies[COOKIE]).digest('hex'));
  back(res, '/admin/account', 'Account updated');
});

router.use((err, req, res, next) => { // eslint-disable-line
  if (err instanceof multer.MulterError) return back(res, '/admin/gallery', '', err.code === 'LIMIT_FILE_SIZE' ? 'One of the photographs is larger than 15 MB.' : 'Upload failed. Try fewer photographs at once.');
  next(err);
});
module.exports = router;
