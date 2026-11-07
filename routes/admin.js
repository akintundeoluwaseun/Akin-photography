'use strict';
const express = require('express');
const multer = require('multer');
const crypto = require('node:crypto');
const { db, settings, setSettings, q } = require('../lib/db');
const { SCHEMA, CATEGORIES } = require('../lib/content');
const sec = require('../lib/security');
const images = require('../lib/images');
const { esc } = require('../lib/ui');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 20 } });
const form = express.urlencoded({ extended: false, limit: '200kb' });
const COOKIE = 'akn_admin';
const secure = process.env.NODE_ENV === 'production';

router.use((req, res, next) => { res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex, nofollow'); next(); });

/* ───────── layout ───────── */
const NAV = [['', 'Overview'], ['bookings', 'Bookings'], ['enquiries', 'Enquiries'], ['gallery', 'Gallery'], ['services', 'Services & prices'], ['testimonials', 'Testimonials'],
  ['content/home', 'Home page'], ['content/about', 'About page'], ['settings/business', 'Contact details'], ['hours', 'Opening hours'], ['settings/social', 'Social media'], ['content/seo', 'Search & sharing'], ['account', 'Account']];
function shell(req, title, body, active) {
  const s = req.session;
  const flash = req.query.ok ? `<p class="flash ok" role="status">${esc(String(req.query.ok).slice(0, 120))}</p>` : req.query.err ? `<p class="flash bad" role="alert">${esc(String(req.query.err).slice(0, 160))}</p>` : '';
  const counts = { b: db.prepare("SELECT COUNT(*) c FROM bookings WHERE status='pending'").get().c, e: db.prepare('SELECT COUNT(*) c FROM enquiries WHERE is_read=0').get().c };
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>${esc(title)} · Akin Photography admin</title><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/css/admin.css?v=1"></head><body>
<aside class="side"><a class="logo" href="/admin"><b>AKIN</b> PHOTOGRAPHY<small>Admin</small></a>
<nav>${NAV.map(([p, l]) => `<a href="/admin/${p}" ${p === active ? 'aria-current="page"' : ''}>${l}${p === 'bookings' && counts.b ? `<span class="pill">${counts.b}</span>` : ''}${p === 'enquiries' && counts.e ? `<span class="pill">${counts.e}</span>` : ''}</a>`).join('')}</nav>
<div class="side-foot"><a href="/" target="_blank" rel="noopener">View website ↗</a><form method="post" action="/admin/logout"><input type="hidden" name="_csrf" value="${s.csrf}"><button>Sign out</button></form></div></aside>
<main class="main"><h1>${esc(title)}</h1>${flash}${body}</main><script src="/js/admin.js?v=1" defer></script></body></html>`;
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
router.get('/', (req, res) => {
  const S = settings();
  const n = (sql) => db.prepare(sql).get().c;
  const stats = [['New booking requests', n("SELECT COUNT(*) c FROM bookings WHERE status='pending'"), 'bookings'], ['Unread enquiries', n('SELECT COUNT(*) c FROM enquiries WHERE is_read=0'), 'enquiries'], ['Photographs in gallery', n('SELECT COUNT(*) c FROM images'), 'gallery'], ['Active services', n('SELECT COUNT(*) c FROM services WHERE active=1'), 'services']];
  const todo = [];
  if (!n('SELECT COUNT(*) c FROM images')) todo.push(['Your gallery is showing sample tiles. Upload your real photographs.', 'gallery']);
  if (!S.whatsapp) todo.push(['Add your WhatsApp number so the WhatsApp buttons and booking messages appear.', 'settings/business']);
  if (!S.phone) todo.push(['Add your phone number so visitors can call you.', 'settings/business']);
  if (!q.services().some((s) => s.price)) todo.push(['No prices are set, so every service says “Price on request”. Add prices where you want them shown.', 'services']);
  const recent = db.prepare('SELECT * FROM bookings ORDER BY id DESC LIMIT 5').all();
  const body = `<div class="stats">${stats.map(([l, v, p]) => `<a class="stat" href="/admin/${p}"><b>${v}</b><span>${l}</span></a>`).join('')}</div>
${todo.length ? `<section class="card"><h2>To do</h2><ul class="todo">${todo.map(([t, p]) => `<li><a href="/admin/${p}">${esc(t)}</a></li>`).join('')}</ul></section>` : ''}
<section class="card"><h2>Latest booking requests</h2>${recent.length ? `<table><thead><tr><th>Ref</th><th>Name</th><th>Service</th><th>Wanted</th><th>Status</th></tr></thead><tbody>${recent.map((b) => `<tr><td>${esc(b.ref)}</td><td>${esc(b.name)}</td><td>${esc(b.service_name)}</td><td>${esc(b.date)} ${esc(b.time)}</td><td><span class="tag ${b.status}">${b.status}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">No booking requests yet.</p>'}</section>`;
  res.type('html').send(shell(req, 'Overview', body, ''));
});

/* ───────── bookings ───────── */
const STATUSES = ['pending', 'confirmed', 'completed', 'declined'];
router.get('/bookings', (req, res) => {
  const st = STATUSES.includes(req.query.status) ? req.query.status : '';
  const rows = st ? db.prepare('SELECT * FROM bookings WHERE status=? ORDER BY id DESC').all(st) : db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
  const wa = (b) => { const d = String(b.phone).replace(/\D/g, ''); return d.length >= 9 ? `https://wa.me/${d.startsWith('0') ? '234' + d.slice(1) : d}` : ''; };
  const body = `<p class="tabs">${['', ...STATUSES].map((s) => `<a href="/admin/bookings${s ? '?status=' + s : ''}" ${s === st ? 'aria-current="true"' : ''}>${s || 'All'}</a>`).join('')}</p>
${rows.length ? rows.map((b) => `<article class="card booking"><header><div><h2>${esc(b.name)} <span class="tag ${b.status}">${b.status}</span></h2><p class="muted">${esc(b.ref)} · received ${fmt(b.created)} · ${b.lang === 'yo' ? 'Yoruba' : 'English'} site</p></div></header>
<dl class="kv"><div><dt>Service</dt><dd>${esc(b.service_name)}</dd></div><div><dt>Wanted</dt><dd>${esc(b.date)} at ${esc(b.time)}</dd></div><div><dt>Where</dt><dd>${b.mode === 'mobile' ? 'Mobile: ' + esc(b.location) : 'Studio'}</dd></div><div><dt>Phone</dt><dd><a href="tel:${esc(b.phone)}">${esc(b.phone)}</a>${wa(b) ? ` · <a href="${wa(b)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}</dd></div></dl>
${b.details ? `<p class="detail">${esc(b.details)}</p>` : ''}
<form class="inline" method="post" action="/admin/bookings/${b.id}">${csrf(req)}<label>Status<select name="status">${STATUSES.map((s) => `<option ${s === b.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label><label class="grow">Private note<input name="note" maxlength="500" value="${esc(b.note)}"></label><button class="btn">Save</button></form>
<form method="post" action="/admin/bookings/${b.id}/delete" data-confirm="Delete this booking request?">${csrf(req)}<button class="link-danger">Delete</button></form></article>`).join('') : '<p class="muted">Nothing here yet.</p>'}`;
  res.type('html').send(shell(req, 'Bookings', body, 'bookings'));
});
router.post('/bookings/:id', form, needCsrf, (req, res) => {
  const st = STATUSES.includes(req.body.status) ? req.body.status : 'pending';
  db.prepare('UPDATE bookings SET status=?, note=? WHERE id=?').run(st, String(req.body.note || '').slice(0, 500), Number(req.params.id));
  back(res, '/admin/bookings', 'Booking updated');
});
router.post('/bookings/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM bookings WHERE id=?').run(Number(req.params.id)); back(res, '/admin/bookings', 'Booking deleted'); });

/* ───────── enquiries ───────── */
router.get('/enquiries', (req, res) => {
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
  const body = rows.length ? rows.map((e) => `<article class="card ${e.is_read ? '' : 'unread'}"><h2>${esc(e.name)} ${e.is_read ? '' : '<span class="tag pending">new</span>'}</h2><p class="muted">${fmt(e.created)}${e.phone ? ` · <a href="tel:${esc(e.phone)}">${esc(e.phone)}</a>` : ''}${e.email ? ` · <a href="mailto:${esc(e.email)}">${esc(e.email)}</a>` : ''}</p><p class="detail">${esc(e.message)}</p>
<div class="row"><form method="post" action="/admin/enquiries/${e.id}/read">${csrf(req)}<button class="btn small">${e.is_read ? 'Mark unread' : 'Mark read'}</button></form><form method="post" action="/admin/enquiries/${e.id}/delete" data-confirm="Delete this enquiry?">${csrf(req)}<button class="link-danger">Delete</button></form></div></article>`).join('') : '<p class="muted">No enquiries yet.</p>';
  res.type('html').send(shell(req, 'Enquiries', body, 'enquiries'));
});
router.post('/enquiries/:id/read', form, needCsrf, (req, res) => { db.prepare('UPDATE enquiries SET is_read = 1 - is_read WHERE id=?').run(Number(req.params.id)); back(res, '/admin/enquiries', 'Updated'); });
router.post('/enquiries/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM enquiries WHERE id=?').run(Number(req.params.id)); back(res, '/admin/enquiries', 'Deleted'); });

/* ───────── gallery ───────── */
const catOpts = (sel) => CATEGORIES.map((c) => `<option value="${c}" ${c === sel ? 'selected' : ''}>${c[0].toUpperCase() + c.slice(1)}</option>`).join('');
router.get('/gallery', (req, res) => {
  const S = settings(), imgs = q.images();
  const body = `<section class="card"><h2>Upload photographs</h2><p class="muted">JPG, PNG or WebP, up to 15 MB each, up to 20 at a time. They are resized automatically for fast loading.</p>
<form class="upload" method="post" action="/admin/gallery/upload" enctype="multipart/form-data"><input type="hidden" name="_csrf" value="${req.session.csrf}">
<label>Category<select name="category">${catOpts('portraits')}</select></label><label class="grow">Photographs<input type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required></label><button class="btn">Upload</button></form></section>
${imgs.length ? `<div class="grid">${imgs.map((i) => `<article class="card photo"><img src="/media/${i.id}-480.webp" alt="" loading="lazy" width="${i.w}" height="${i.h}">
<form method="post" action="/admin/gallery/${i.id}">${csrf(req)}<label>Category<select name="category">${catOpts(i.category)}</select></label><label>Caption (English)<input name="title_en" maxlength="140" value="${esc(i.title_en)}"></label><label>Caption (Yoruba)<input name="title_yo" maxlength="140" value="${esc(i.title_yo)}"></label>
<div class="two"><label>Order<input type="number" name="sort" value="${i.sort}" min="-999" max="999"></label><label class="check"><input type="checkbox" name="featured" ${i.featured ? 'checked' : ''}> Show on home page</label></div><button class="btn small">Save</button></form>
<div class="row"><form method="post" action="/admin/gallery/${i.id}/use">${csrf(req)}<input type="hidden" name="as" value="hero_image"><button class="btn small ${String(S.hero_image) === String(i.id) ? 'on' : 'ghost'}">${String(S.hero_image) === String(i.id) ? '✓ Home hero' : 'Use as home hero'}</button></form>
<form method="post" action="/admin/gallery/${i.id}/use">${csrf(req)}<input type="hidden" name="as" value="about_image"><button class="btn small ${String(S.about_image) === String(i.id) ? 'on' : 'ghost'}">${String(S.about_image) === String(i.id) ? '✓ About photo' : 'Use on About'}</button></form></div>
<form method="post" action="/admin/gallery/${i.id}/delete" data-confirm="Delete this photograph for good?">${csrf(req)}<button class="link-danger">Delete</button></form></article>`).join('')}</div>` : '<p class="muted">No photographs yet. The public gallery is showing sample tiles until you upload.</p>'}`;
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
router.post('/gallery/:id', form, needCsrf, (req, res) => {
  const b = req.body, cat = CATEGORIES.includes(b.category) ? b.category : 'other';
  db.prepare('UPDATE images SET category=?,title_en=?,title_yo=?,sort=?,featured=? WHERE id=?').run(cat, String(b.title_en || '').slice(0, 140), String(b.title_yo || '').slice(0, 140), Math.max(-999, Math.min(999, parseInt(b.sort, 10) || 0)), b.featured ? 1 : 0, Number(req.params.id));
  back(res, '/admin/gallery', 'Photograph saved');
});
router.post('/gallery/:id/use', form, needCsrf, (req, res) => {
  const k = ['hero_image', 'about_image'].includes(req.body.as) ? req.body.as : null;
  if (k) { const cur = String(settings()[k]); setSettings({ [k]: cur === String(req.params.id) ? '' : String(Number(req.params.id)) }); }
  back(res, '/admin/gallery', 'Updated');
});
router.post('/gallery/:id/delete', form, needCsrf, (req, res) => {
  const id = Number(req.params.id), S = settings();
  db.prepare('DELETE FROM images WHERE id=?').run(id); db.prepare('UPDATE services SET image_id=NULL WHERE image_id=?').run(id); images.removeFiles(id);
  const clear = {}; for (const k of ['hero_image', 'about_image']) if (String(S[k]) === String(id)) clear[k] = '';
  if (Object.keys(clear).length) setSettings(clear);
  back(res, '/admin/gallery', 'Photograph deleted');
});

/* ───────── services ───────── */
const slugify = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'service';
function svcForm(req, s) {
  const imgs = q.images();
  return `<form class="svc-form" method="post" action="/admin/services/${s ? s.id : 'new'}">${csrf(req)}
<div class="two"><label>Name (English)<input name="name_en" required maxlength="80" value="${esc(s ? s.name_en : '')}"></label><label>Name (Yoruba)<input name="name_yo" maxlength="80" value="${esc(s ? s.name_yo : '')}"></label></div>
<div class="two"><label>Description (English)<textarea name="desc_en" rows="3" maxlength="500">${esc(s ? s.desc_en : '')}</textarea></label><label>Description (Yoruba)<textarea name="desc_yo" rows="3" maxlength="500">${esc(s ? s.desc_yo : '')}</textarea></label></div>
<div class="three"><label>Price type<select name="price_mode">${[['quote', 'Price on request'], ['fixed', 'Fixed price'], ['from', 'Starting from']].map(([v, l]) => `<option value="${v}" ${s && s.price_mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
<label>Price (₦, numbers only)<input name="price" inputmode="numeric" pattern="[0-9]*" maxlength="9" value="${s && s.price ? s.price : ''}"></label><label class="check"><input type="checkbox" name="negotiable" ${s && s.negotiable ? 'checked' : ''}> Negotiable</label></div>
<div class="three"><label>Gallery category<select name="category">${catOpts(s ? s.category : 'other')}</select></label>
<label>Photo for this service<select name="image_id"><option value="">Automatic</option>${imgs.map((i) => `<option value="${i.id}" ${s && s.image_id === i.id ? 'selected' : ''}>#${i.id} · ${i.category}${i.title_en ? ' · ' + esc(i.title_en) : ''}</option>`).join('')}</select></label>
<label>Order<input type="number" name="sort" value="${s ? s.sort : 99}" min="0" max="999"></label></div>
<label class="check"><input type="checkbox" name="active" ${!s || s.active ? 'checked' : ''}> Show on the website</label>
<button class="btn">${s ? 'Save service' : 'Add service'}</button></form>`;
}
router.get('/services', (req, res) => {
  const body = `<p class="muted">Prices stay empty until you set them. “Price on request” is shown for any service without one.</p>
${q.services(true).map((s) => `<details class="card" ${req.query.open == s.id ? 'open' : ''}><summary><b>${esc(s.name_en)}</b> ${s.active ? '' : '<span class="tag declined">hidden</span>'} <span class="muted">${s.price && s.price_mode !== 'quote' ? '₦' + s.price.toLocaleString('en-NG') : 'Price on request'}</span></summary>${svcForm(req, s)}<form method="post" action="/admin/services/${s.id}/delete" data-confirm="Delete this service?">${csrf(req)}<button class="link-danger">Delete service</button></form></details>`).join('')}
<details class="card"><summary><b>+ Add a service</b></summary>${svcForm(req, null)}</details>`;
  res.type('html').send(shell(req, 'Services & prices', body, 'services'));
});
function svcSave(req) {
  const b = req.body, mode = ['quote', 'fixed', 'from'].includes(b.price_mode) ? b.price_mode : 'quote';
  const price = /^\d{1,9}$/.test(String(b.price || '').trim()) ? Number(b.price) : null;
  return { name_en: String(b.name_en || '').trim().slice(0, 80), name_yo: String(b.name_yo || '').trim().slice(0, 80), desc_en: String(b.desc_en || '').slice(0, 500), desc_yo: String(b.desc_yo || '').slice(0, 500),
    category: CATEGORIES.includes(b.category) ? b.category : 'other', price: mode === 'quote' ? null : price, price_mode: mode === 'quote' || !price ? 'quote' : mode, negotiable: b.negotiable ? 1 : 0,
    image_id: /^\d+$/.test(b.image_id || '') && q.image(Number(b.image_id)) ? Number(b.image_id) : null, sort: Math.max(0, Math.min(999, parseInt(b.sort, 10) || 0)), active: b.active ? 1 : 0 };
}
router.post('/services/new', form, needCsrf, (req, res) => {
  const v = svcSave(req); if (!v.name_en) return back(res, '/admin/services', '', 'A service needs a name.');
  let slug = slugify(v.name_en); while (db.prepare('SELECT 1 FROM services WHERE slug=?').get(slug)) slug += '-' + crypto.randomInt(10, 99);
  db.prepare('INSERT INTO services(slug,name_en,name_yo,desc_en,desc_yo,category,price,price_mode,negotiable,image_id,sort,active) VALUES (@slug,@name_en,@name_yo,@desc_en,@desc_yo,@category,@price,@price_mode,@negotiable,@image_id,@sort,@active)').run({ ...v, slug });
  back(res, '/admin/services', 'Service added');
});
router.post('/services/:id', form, needCsrf, (req, res) => {
  const v = svcSave(req); if (!v.name_en) return back(res, '/admin/services', '', 'A service needs a name.');
  db.prepare('UPDATE services SET name_en=@name_en,name_yo=@name_yo,desc_en=@desc_en,desc_yo=@desc_yo,category=@category,price=@price,price_mode=@price_mode,negotiable=@negotiable,image_id=@image_id,sort=@sort,active=@active WHERE id=@id').run({ ...v, id: Number(req.params.id) });
  back(res, `/admin/services?open=${Number(req.params.id)}`, 'Service saved');
});
router.post('/services/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM services WHERE id=?').run(Number(req.params.id)); back(res, '/admin/services', 'Service deleted'); });

/* ───────── testimonials ───────── */
function tForm(req, t) {
  return `<form class="svc-form" method="post" action="/admin/testimonials/${t ? t.id : 'new'}">${csrf(req)}<div class="two"><label>Customer name<input name="name" required maxlength="80" value="${esc(t ? t.name : '')}"></label><label>Detail (optional, e.g. “Wedding client”)<input name="role" maxlength="80" value="${esc(t ? t.role : '')}"></label></div>
<div class="two"><label>What they said (English)<textarea name="text_en" rows="3" required maxlength="600">${esc(t ? t.text_en : '')}</textarea></label><label>What they said (Yoruba, optional)<textarea name="text_yo" rows="3" maxlength="600">${esc(t ? t.text_yo : '')}</textarea></label></div>
<div class="two"><label>Order<input type="number" name="sort" value="${t ? t.sort : 0}"></label><label class="check"><input type="checkbox" name="active" ${!t || t.active ? 'checked' : ''}> Show on the website</label></div><button class="btn">${t ? 'Save' : 'Add testimonial'}</button></form>`;
}
router.get('/testimonials', (req, res) => {
  const body = `<p class="muted">Only add words your real customers have given you, with their permission. The testimonials section stays hidden on the website until you add one.</p>
${q.testimonials(true).map((t) => `<details class="card"><summary><b>${esc(t.name)}</b> ${t.active ? '' : '<span class="tag declined">hidden</span>'}</summary>${tForm(req, t)}<form method="post" action="/admin/testimonials/${t.id}/delete" data-confirm="Delete this testimonial?">${csrf(req)}<button class="link-danger">Delete</button></form></details>`).join('')}
<details class="card" open><summary><b>+ Add a testimonial</b></summary>${tForm(req, null)}</details>`;
  res.type('html').send(shell(req, 'Testimonials', body, 'testimonials'));
});
const tSave = (b) => ({ name: String(b.name || '').trim().slice(0, 80), role: String(b.role || '').trim().slice(0, 80), text_en: String(b.text_en || '').trim().slice(0, 600), text_yo: String(b.text_yo || '').trim().slice(0, 600), sort: parseInt(b.sort, 10) || 0, active: b.active ? 1 : 0 });
router.post('/testimonials/new', form, needCsrf, (req, res) => { const v = tSave(req.body); if (!v.name || !v.text_en) return back(res, '/admin/testimonials', '', 'Name and testimonial text are required.'); db.prepare('INSERT INTO testimonials(name,role,text_en,text_yo,sort,active) VALUES (@name,@role,@text_en,@text_yo,@sort,@active)').run(v); back(res, '/admin/testimonials', 'Testimonial added'); });
router.post('/testimonials/:id', form, needCsrf, (req, res) => { const v = tSave(req.body); if (!v.name || !v.text_en) return back(res, '/admin/testimonials', '', 'Name and testimonial text are required.'); db.prepare('UPDATE testimonials SET name=@name,role=@role,text_en=@text_en,text_yo=@text_yo,sort=@sort,active=@active WHERE id=@id').run({ ...v, id: Number(req.params.id) }); back(res, '/admin/testimonials', 'Testimonial saved'); });
router.post('/testimonials/:id/delete', form, needCsrf, (req, res) => { db.prepare('DELETE FROM testimonials WHERE id=?').run(Number(req.params.id)); back(res, '/admin/testimonials', 'Deleted'); });

/* ───────── content & settings (driven by the schema) ───────── */
function fieldHtml(f, S, req) {
  const inp = (name, label, v, lang) => {
    const l = `${esc(label)}${lang ? ` <span class="lang-tag">${lang}</span>` : ''}`;
    if (f.type === 'textarea') return `<label>${l}<textarea name="${name}" rows="4" maxlength="1500">${esc(v)}</textarea></label>`;
    if (f.type === 'image') { const imgs = q.images(); return `<label>${l}<select name="${name}"><option value="">None (use a sample tile)</option>${imgs.map((i) => `<option value="${i.id}" ${String(v) === String(i.id) ? 'selected' : ''}>#${i.id} · ${i.category}${i.title_en ? ' · ' + esc(i.title_en) : ''}</option>`).join('')}</select></label>`; }
    return `<label>${l}<input name="${name}" type="${f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'}" maxlength="400" value="${esc(v)}"></label>`;
  };
  return `<div class="fld">${f.bi ? `<div class="two">${inp(f.k + '_en', f.label, S[f.k + '_en'], 'English')}${inp(f.k + '_yo', f.label, S[f.k + '_yo'], 'Yoruba')}</div>` : inp(f.k, f.label, S[f.k])}${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
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
    for (const f of g.fields) for (const k of f.bi ? [f.k + '_en', f.k + '_yo'] : [f.k]) {
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
