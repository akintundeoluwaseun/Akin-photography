'use strict';
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { db, settings, q, DATA_DIR } = require('./lib/db');
const { CATEGORIES } = require('./lib/content');
const ui = require('./lib/ui');
const { router: publicRouter, page } = require('./routes/public');
const adminRouter = require('./routes/admin');
const { t: T_ } = require('./lib/i18n');
const images = require('./lib/images');
const remote = require('./lib/remote');

const app = express();
let seeded = false; // first request waits for the starter photographs (matters on serverless cold starts)
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => (seeded ? next() : ready.then(() => { seeded = true; next(); })));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; frame-src https://www.google.com; form-action 'self' https://wa.me; base-uri 'self'; object-src 'none'");
  next();
});
app.use(cookieParser());

/* ── static files: compressed-friendly, long cache for versioned assets and photographs ── */
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '7d' }));
app.use('/js', express.static(path.join(__dirname, 'public/js'), { maxAge: '7d' }));
app.get('/media/:file', async (req, res, next) => {
  const f = req.params.file;
  if (!/^\d+-(480|960|1600|og)\.(webp|jpg)$/.test(f)) return res.sendStatus(404);
  let p = path.join(images.DIR, f);
  try { if (!fs.existsSync(p)) p = remote.hasFile(f) ? await remote.fetchFile(f) : null; } catch (e) { return next(e); }
  if (!p || !fs.existsSync(p)) return res.sendStatus(404);
  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.sendFile(p);
});

/* ── generated tonal placeholders, shown until real photographs are uploaded ── */
const TONES = { portraits: ['#c9a98a', '#6b4a38'], events: ['#b99a6b', '#3b2e24'], studio: ['#d8d3ca', '#6c655b'], outdoor: ['#a9b08c', '#3f4630'], passport: ['#e6e0d6', '#9a9184'], commercial: ['#8e857a', '#1a1816'], other: ['#cdbb9c', '#5c4a36'] };
const SIZES = [[800, 1000], [1000, 700], [800, 1000], [1000, 667], [800, 800], [1000, 750], [800, 1066], [800, 1000], [800, 1000], [1000, 800], [800, 1000], [1000, 700]];
app.get('/ph/:cat/:n.svg', (req, res) => {
  const cat = TONES[req.params.cat] ? req.params.cat : 'other', n = Math.max(1, Math.min(60, Number(req.params.n) || 1));
  const [w, h] = SIZES[(n - 1) % SIZES.length], [a, b] = TONES[cat];
  const cx = w * (0.3 + ((n * 37) % 40) / 100), cy = h * (0.3 + ((n * 53) % 30) / 100), r = Math.min(w, h) * 0.34;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs>
<radialGradient id="g" cx="${cx / w}" cy="${cy / h}" r="0.9"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient>
<radialGradient id="v" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient></defs>
<rect width="${w}" height="${h}" fill="url(#g)"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" opacity=".07"/><circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"/>
<circle cx="${cx}" cy="${cy}" r="${r * 0.2}" fill="#fff" opacity=".1"/><rect width="${w}" height="${h}" fill="url(#v)"/></svg>`;
  res.type('image/svg+xml').setHeader('Cache-Control', 'public, max-age=86400');
  res.send(svg);
});
app.get('/favicon.svg', (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#0d0c0b"/><circle cx="32" cy="32" r="14" fill="none" stroke="#b08d57" stroke-width="3"/><circle cx="32" cy="32" r="5" fill="#b08d57"/></svg>'));
app.get('/og-default.svg', (req, res) => res.type('image/svg+xml').send('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#0d0c0b"/><circle cx="1010" cy="315" r="210" fill="none" stroke="#b08d57" stroke-width="3" opacity=".6"/><circle cx="1010" cy="315" r="70" fill="#b08d57" opacity=".25"/><text x="90" y="300" font-family="Georgia,serif" font-size="96" fill="#f6f2ec">AKIN</text><text x="94" y="372" font-family="Helvetica,Arial,sans-serif" font-size="34" letter-spacing="14" fill="#b08d57">PHOTOGRAPHY</text><text x="94" y="450" font-family="Georgia,serif" font-size="30" fill="#bdb5a8">Ado-Ekiti · Ekiti State</text></svg>'));

app.get('/robots.txt', (req, res) => res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /booking/received/\n\nSitemap: ${ui.baseUrl(req)}/sitemap.xml\n`));
app.get('/sitemap.xml', (req, res) => {
  const base = ui.baseUrl(req), paths = ['/', '/about', '/services', '/portfolio', '/pricing', '/booking', '/contact'];
  const url = (p) => `<url><loc>${base}${p}</loc></url>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths.map(url).join('\n')}\n</urlset>`;
  res.type('application/xml').send(xml);
});

app.use(remote.middleware);
app.use('/admin', adminRouter);
app.use('/', publicRouter);

/* ── errors ── */
app.use((req, res) => {
  if (!req.ctx) req.ctx = { t: T_, S: settings(), L: (p) => p };
  const { t, L } = req.ctx;
  res.status(404);
  page(req, res, { title: t('e404_title'), noindex: true, body: `<section class="err-page wrap"><p class="eyebrow dark">404</p><h1>${t('e404_title')}</h1><p class="lead">${t('e404_text')}</p><a class="btn btn-dark" href="${L('/')}">${t('conf_home')}</a></section>` });
});
app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err);
  if (res.headersSent) return next(err);
  if (!req.ctx) req.ctx = { t: T_, S: settings(), L: (p) => p };
  const { t, L } = req.ctx;
  res.status(err.status || 500);
  page(req, res, { title: t('e500_title'), noindex: true, body: `<section class="err-page wrap"><p class="eyebrow dark">${err.status || 500}</p><h1>${t('e500_title')}</h1><p class="lead">${t('e500_text')}</p><a class="btn btn-dark" href="${L('/')}">${t('conf_home')}</a></section>` });
});

/* ── first run: create the owner's admin account from lib/admin-account.js ── */
function ensureAdmin() {
  if (db.prepare('SELECT COUNT(*) c FROM admins').get().c) return;
  const { PHONE, PASSWORD_HASH } = require('./lib/admin-account');
  db.prepare('INSERT INTO admins(email,hash) VALUES (?,?)').run(ui.digits(PHONE), PASSWORD_HASH);
  console.log('Admin account created. Sign in with the phone number set in lib/admin-account.js');
}
ensureAdmin();
const ready = require('./lib/seed').seedPhotos().then(() => { if (remote.enabled && !remote.state.head) return remote.persist(); }).catch((e) => console.error(e));

const PORT = Number(process.env.PORT) || 3000;
if (require.main === module) ready.then(() => app.listen(PORT, () => console.log(`Akin Photography running on http://localhost:${PORT}`)));
app.ready = ready;
module.exports = app;
