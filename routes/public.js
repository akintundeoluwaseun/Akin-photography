'use strict';
const express = require('express');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { db, settings, q } = require('../lib/db');
const { CATEGORIES } = require('../lib/content');
const { make } = require('../lib/i18n');
const ui = require('../lib/ui');
const { esc, layout, tile, img, sampleImages, icon, waLink, telLink, val, money, baseUrl } = ui;
const { limited, publicCsrf, checkPublicCsrf } = require('../lib/security');
const images = require('../lib/images');

const router = express.Router();

/* language: /yo/... is Yoruba, everything else English. Strip the prefix and remember it. */
function langMiddleware(req, res, next) {
  const m = req.url.match(/^\/yo(\/|\?|$)/);
  const lang = m ? 'yo' : 'en';
  if (m) req.url = req.url.replace(/^\/yo/, '') || '/';
  const t = make(lang), S = settings();
  req.ctx = { lang, t, S, L: (p) => (lang === 'yo' ? '/yo' + (p === '/' ? '' : p) : p) };
  res.setHeader('Content-Language', lang);
  next();
}

const todayLagos = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos' }).format(new Date());
const svcName = (s, lang) => (lang === 'yo' && s.name_yo ? s.name_yo : s.name_en);
const svcDesc = (s, lang) => (lang === 'yo' && s.desc_yo ? s.desc_yo : s.desc_en);
const ip = (req) => req.ip || 'x';

function gallery(lang, cat) {
  const real = q.images(cat);
  if (real.length || q.images().length) return { items: real.map((r) => tile(r, lang)), sample: false };
  const all = sampleImages().filter((s) => !cat || s.category === cat);
  return { items: all.map((s) => tile(s, lang)), sample: true };
}
function featuredTiles(lang) {
  const real = q.images();
  if (real.length) { const f = real.filter((r) => r.featured); return (f.length ? f : real).slice(0, 7).map((r) => tile(r, lang)); }
  return sampleImages().slice(0, 7).map((s) => tile(s, lang));
}
function svcTile(s, lang) {
  if (s.image_id) { const r = q.image(s.image_id); if (r) return tile(r, lang); }
  const own = q.images(s.category)[0];
  if (own) return tile(own, lang);
  const sample = sampleImages().find((x) => x.category === s.category) || sampleImages()[0];
  return tile(sample, lang);
}
function priceLabel(s, req) {
  const { t, S } = req.ctx;
  if (s.price_mode === 'quote' || !s.price) return `<span class="price-q">${t('price_quote')}</span>`;
  const prefix = s.price_mode === 'from' ? `<small>${t('price_from')}</small> ` : '';
  return `${prefix}<span class="price-n">${esc(money(S, s.price))}</span>${s.negotiable ? ` <em class="neg">${t('price_negotiable')}</em>` : ''}`;
}
const page = (req, res, o) => res.type('html').send(layout(req, { ...o, _services: q.services() }));

router.use(langMiddleware);

/* ───────── home ───────── */
router.get('/', (req, res) => {
  const { lang, t, L, S } = req.ctx;
  const heroId = Number(S.hero_image) || 0, hero = heroId && q.image(heroId);
  const ht = hero ? tile(hero, lang) : null;
  const ft = featuredTiles(lang), services = q.services().slice(0, 8), tests = q.testimonials();
  const why = [1, 2, 3, 4].map((n) => `<li class="reveal"><span class="num">0${n}</span><h3>${esc(val(S, `why${n}_t`, lang))}</h3><p>${esc(val(S, `why${n}_d`, lang))}</p></li>`).join('');
  const body = `
<section class="hero ${ht ? 'hero-photo' : ''}">
  ${ht ? img({ ...ht, src: ht.full, srcset: ht.srcset }, 'hero-img', '100vw', true) : '<div class="hero-light" aria-hidden="true"></div>'}
  <div class="hero-shade" aria-hidden="true"></div>
  <div class="hero-in">
    <p class="eyebrow rise">${esc(val(S, 'hero_eyebrow', lang))}</p>
    <h1 class="rise d1">${esc(val(S, 'hero_title', lang))}</h1>
    <p class="lead rise d2">${esc(val(S, 'hero_text', lang))}</p>
    <div class="hero-cta rise d3"><a class="btn btn-gold" href="${L('/booking')}">${t('book')}</a><a class="btn btn-ghost" href="${L('/portfolio')}">${t('explore')}</a></div>
  </div>
  <a class="scroll-cue" href="#work" aria-label="${t('featured_title')}"><span></span></a>
</section>

<section class="section" id="work">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow dark">01</p><h2>${t('featured_title')}</h2><a class="more" href="${L('/portfolio')}">${t('featured_all')} →</a></div>
    <div class="mosaic n${Math.min(ft.length, 7)}">${ft.map((f, i) => `<a class="m m${i + 1} reveal" href="${L('/portfolio')}" tabindex="${i ? 0 : 0}">${img(f, '', '(min-width:900px) 40vw, 90vw')}</a>`).join('')}</div>
  </div>
</section>

<section class="section tone" id="what">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow dark">02</p><h2>${t('services_title')}</h2><a class="more" href="${L('/services')}">${t('services_all')} →</a></div>
    <ol class="svc-list">${services.map((s, i) => `<li class="reveal"><a href="${L('/services')}#${esc(s.slug)}"><span class="num">${String(i + 1).padStart(2, '0')}</span><span class="svc-name">${esc(svcName(s, lang))}</span><span class="svc-desc">${esc(svcDesc(s, lang))}</span><span class="arrow" aria-hidden="true">→</span></a></li>`).join('')}</ol>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head reveal"><p class="eyebrow dark">03</p><h2>${esc(val(S, 'why_title', lang))}</h2></div>
    <ul class="why">${why}</ul>
  </div>
</section>

${tests.length ? `<section class="section tone"><div class="wrap"><div class="sec-head reveal"><p class="eyebrow dark">04</p><h2>${t('testimonials_title')}</h2></div>
<div class="quotes">${tests.map((x) => `<figure class="quote reveal"><blockquote>${esc(lang === 'yo' && x.text_yo ? x.text_yo : x.text_en)}</blockquote><figcaption>${esc(x.name)}${x.role ? `<span>${esc(x.role)}</span>` : ''}</figcaption></figure>`).join('')}</div></div></section>` : ''}

<section class="cta-band">
  <div class="wrap reveal">
    <h2>${esc(val(S, 'cta_title', lang))}</h2><p>${esc(val(S, 'cta_text', lang))}</p>
    <div class="hero-cta"><a class="btn btn-gold" href="${L('/booking')}">${t('book')}</a>${waLink(t('wa_hello_generic')) ? `<a class="btn btn-ghost" href="${esc(waLink(t('wa_hello_generic')))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 'ic-sm')} ${t('whatsapp_us')}</a>` : `<a class="btn btn-ghost" href="${L('/contact')}">${t('nav_contact')}</a>`}</div>
  </div>
</section>`;
  const og = ht ? `/media/${heroId}-og.jpg` : null;
  page(req, res, { body, home: true, path: '/', ogImage: og });
});

/* ───────── about ───────── */
router.get('/about', (req, res) => {
  const { lang, t, L, S } = req.ctx;
  const aid = Number(S.about_image) || 0, ar = aid && q.image(aid), at = ar ? tile(ar, lang) : null;
  const block = (h, k) => `<section class="about-block reveal"><h2>${t(h)}</h2><p>${esc(val(S, k, lang))}</p></section>`;
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">Akin Photography</p><h1>${t('about_title')}</h1><p class="lead">${esc(val(S, 'about_intro', lang))}</p></div></header>
<div class="wrap about-grid">
  <div class="about-text">${block('about_story_h', 'about_story')}${block('about_phil_h', 'about_philosophy')}${block('about_quality_h', 'about_quality')}${block('about_approach_h', 'about_approach')}${block('about_avail_h', 'about_availability')}</div>
  <aside class="about-side reveal">${at ? `<div class="about-photo">${img(at, '', '(min-width:900px) 40vw, 90vw')}</div>` : `<div class="about-photo ph-sample" aria-hidden="true">${img(tile({ sample: true, n: 7, category: 'portraits', w: 800, h: 1066, title_en: '', title_yo: '' }, lang), '', '40vw')}</div>`}
    <a class="btn btn-dark" href="${L('/booking')}">${t('book')}</a></aside>
</div>`;
  page(req, res, { body, path: '/about', title: t('about_title'), ogImage: ar ? `/media/${aid}-og.jpg` : null });
});

/* ───────── services ───────── */
router.get('/services', (req, res) => {
  const { lang, t, L } = req.ctx;
  const wa = (s) => waLink(t('wa_hello_service', { service: svcName(s, lang) }));
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('nav_services')}</p><h1>${t('services_page_title')}</h1><p class="lead">${t('services_intro')}</p></div></header>
<div class="wrap svc-rows">${q.services().map((s, i) => {
    const ti = svcTile(s, lang);
    return `<article class="svc-row ${i % 2 ? 'flip' : ''} reveal" id="${esc(s.slug)}">
      <div class="svc-img">${img(ti, '', '(min-width:900px) 45vw, 92vw')}</div>
      <div class="svc-body"><p class="num">${String(i + 1).padStart(2, '0')}</p><h2>${esc(svcName(s, lang))}</h2><p>${esc(svcDesc(s, lang))}</p>
        <p class="price">${priceLabel(s, req)}</p>
        <div class="row-cta"><a class="btn btn-dark" href="${L('/booking')}?service=${esc(s.slug)}">${t('book_this')}</a>${wa(s) ? `<a class="btn btn-line" href="${esc(wa(s))}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 'ic-sm')} ${t('ask_wa')}</a>` : ''}</div></div>
    </article>`;
  }).join('')}</div>`;
  page(req, res, { body, path: '/services', title: t('services_page_title') });
});

/* ───────── pricing ───────── */
router.get('/pricing', (req, res) => {
  const { lang, t, L } = req.ctx;
  const rows = q.services().map((s) => `<li class="price-row reveal"><div><h2>${esc(svcName(s, lang))}</h2><p>${esc(svcDesc(s, lang))}</p></div><div class="price-val">${priceLabel(s, req)}</div><a class="btn btn-line" href="${L('/booking')}?service=${esc(s.slug)}">${t('book_short')}</a></li>`).join('');
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('nav_pricing')}</p><h1>${t('pricing_title')}</h1><p class="lead">${t('pricing_intro')}</p></div></header>
<div class="wrap"><ul class="price-list">${rows}</ul>
<div class="quote-box reveal"><h2>${t('custom_quote_h')}</h2><p>${t('custom_quote_t')}</p><a class="btn btn-gold" href="${L('/contact')}?quote=1">${t('custom_quote_btn')}</a></div></div>`;
  page(req, res, { body, path: '/pricing', title: t('pricing_title') });
});

/* ───────── portfolio ───────── */
router.get('/portfolio', (req, res) => {
  const { lang, t, L } = req.ctx;
  const cat = CATEGORIES.includes(req.query.cat) ? req.query.cat : '';
  const all = gallery(lang, '');
  const g = cat ? gallery(lang, cat) : all;
  const present = new Set(all.items.map((i) => i.cat));
  const tabs = ['', ...CATEGORIES.filter((c) => present.has(c))];
  const fig = (it, i) => `<figure class="shot reveal" data-cat="${it.cat}" data-full="${esc(it.full)}" data-alt="${esc(it.alt)}" data-i="${i}"><a href="${esc(it.full)}" aria-label="${esc(it.alt || t('cat_' + it.cat))}">${img(it, '', '(min-width:1100px) 30vw, (min-width:640px) 45vw, 92vw')}</a></figure>`;
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('nav_portfolio')}</p><h1>${t('portfolio_title')}</h1><p class="lead">${t('portfolio_intro')}</p></div></header>
<div class="wrap">
  <nav class="filters" aria-label="${t('portfolio_title')}">${tabs.map((c) => `<a href="${L('/portfolio')}${c ? '?cat=' + c : ''}" data-cat="${c}" ${c === cat ? 'aria-current="true"' : ''}>${t('cat_' + (c || 'all'))}</a>`).join('')}</nav>
  <div class="masonry" id="masonry">${all.items.map((it, i) => ((!cat || it.cat === cat) ? fig(it, i) : fig(it, i).replace('class="shot reveal"', 'class="shot reveal" hidden'))).join('')}</div>
  <p class="empty" id="gallery-empty" ${g.items.length ? 'hidden' : ''}>${t('empty_cat')}</p>
</div>
<div class="viewer" id="viewer" role="dialog" aria-modal="true" aria-label="${t('portfolio_title')}" hidden>
  <button class="v-close" aria-label="${t('viewer_close')}">×</button>
  <button class="v-prev" aria-label="${t('viewer_prev')}">‹</button>
  <figure><img alt=""><figcaption></figcaption></figure>
  <button class="v-next" aria-label="${t('viewer_next')}">›</button>
  <p class="v-count" aria-live="polite"></p>
</div>`;
  page(req, res, { body, path: '/portfolio', title: t('portfolio_title'), scripts: ['/js/gallery.js?v=1'] });
});

/* ───────── booking ───────── */
function bookingForm(req, res, o = {}) {
  const { lang, t, L, S } = req.ctx;
  const tok = publicCsrf(req, res), v = o.values || {}, er = o.errors || {};
  const services = q.services();
  const pre = v.service || (services.find((s) => s.slug === req.query.service) || {}).id;
  const slots = String(S.time_slots || '').split(',').map((x) => x.trim()).filter(Boolean);
  const f = (id, label, input, extra = '') => `<div class="field ${er[id] ? 'has-err' : ''}"><label for="${id}">${label}</label>${input}${er[id] ? `<p class="err" id="${id}-e">${esc(er[id])}</p>` : ''}${extra}</div>`;
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('nav_book')}</p><h1>${t('booking_title')}</h1><p class="lead">${t('booking_intro')}</p></div></header>
<div class="wrap form-wrap">
<form class="form" method="post" action="${L('/booking')}" novalidate id="booking-form">
  <input type="hidden" name="_csrf" value="${tok}">
  <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
  ${o.formError ? `<p class="form-err" role="alert">${esc(o.formError)}</p>` : ''}
  ${f('service', t('f_service'), `<select id="service" name="service" required><option value="">${t('f_choose')}</option>${services.map((s) => `<option value="${s.id}" ${String(pre) === String(s.id) ? 'selected' : ''}>${esc(svcName(s, lang))}</option>`).join('')}</select>`)}
  <div class="two">${f('name', t('f_name'), `<input id="name" name="name" autocomplete="name" required maxlength="80" value="${esc(v.name || '')}">`)}${f('phone', t('f_phone'), `<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="24" value="${esc(v.phone || '')}">`)}</div>
  <div class="two">${f('date', t('f_date'), `<input id="date" name="date" type="date" required min="${todayLagos()}" value="${esc(v.date || '')}">`)}${f('time', t('f_time'), `<select id="time" name="time" required><option value="">—</option>${slots.map((s) => `<option ${v.time === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>`)}</div>
  <fieldset class="mode"><legend>${t('f_mode')}</legend>
    <label><input type="radio" name="mode" value="studio" ${v.mode !== 'mobile' ? 'checked' : ''}><span>${t('f_studio')}</span></label>
    <label><input type="radio" name="mode" value="mobile" ${v.mode === 'mobile' ? 'checked' : ''}><span>${t('f_mobile')}</span></label></fieldset>
  <div id="loc-wrap" ${v.mode === 'mobile' ? '' : 'hidden'}>${f('location', t('f_location'), `<input id="location" name="location" maxlength="200" placeholder="${esc(t('f_location_h'))}" value="${esc(v.location || '')}">`)}</div>
  ${f('details', `${t('f_details')} <span class="opt">(${t('f_optional')})</span>`, `<textarea id="details" name="details" rows="5" maxlength="1500" placeholder="${esc(t('f_details_h'))}">${esc(v.details || '')}</textarea>`)}
  <button class="btn btn-gold" type="submit" data-busy="${t('f_sending')}">${t('f_send_booking')}</button>
</form></div>`;
  page(req, res, { body, path: '/booking', title: t('booking_title'), scripts: ['/js/forms.js?v=1'] });
}
router.get('/booking', (req, res) => bookingForm(req, res));

const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const validPhone = (p) => /^[\d+\s().-]{7,24}$/.test(p) && p.replace(/\D/g, '').length >= 7 && p.replace(/\D/g, '').length <= 15;

router.post('/booking', express.urlencoded({ extended: false, limit: '20kb' }), (req, res) => {
  const { t, L, S, lang } = req.ctx;
  const b = req.body || {};
  if (clean(b.website, 50)) return res.redirect(L('/booking'));            // honeypot: bots fill this in
  const values = { service: clean(b.service, 10), name: clean(b.name, 80), phone: clean(b.phone, 24), date: clean(b.date, 10), time: clean(b.time, 5), mode: b.mode === 'mobile' ? 'mobile' : 'studio', location: clean(b.location, 200), details: clean(b.details, 1500) };
  if (!checkPublicCsrf(req)) return bookingForm(req, res.status(400), { values, formError: t('err_security') });
  if (limited('book:' + ip(req), 6, 3600e3)) return bookingForm(req, res.status(429), { values, formError: t('err_many') });
  const errors = {}, svc = /^\d+$/.test(values.service) ? q.service(Number(values.service)) : null;
  if (!svc || !svc.active) errors.service = t('err_service');
  if (values.name.length < 2) errors.name = t('err_name');
  if (!validPhone(values.phone)) errors.phone = t('err_phone');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || isNaN(Date.parse(values.date)) || values.date < todayLagos()) errors.date = t('err_date');
  const slots = String(S.time_slots || '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!slots.includes(values.time)) errors.time = t('err_time');
  if (values.mode === 'mobile' && values.location.length < 3) errors.location = t('err_location');
  if (Object.keys(errors).length) return bookingForm(req, res.status(422), { values, errors, formError: t('err_fix') });
  const ref = 'AKN-' + crypto.randomBytes(5).toString('hex').toUpperCase().slice(0, 6);
  db.prepare('INSERT INTO bookings(ref,service_id,service_name,name,phone,date,time,mode,location,details,lang,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
    .run(ref, svc.id, svc.name_en, values.name, values.phone, values.date, values.time, values.mode, values.mode === 'mobile' ? values.location : '', values.details, lang, Date.now());
  res.redirect(303, L('/booking/received/' + ref));
});

router.get('/booking/received/:ref', (req, res) => {
  const { lang, t, L } = req.ctx;
  const b = db.prepare('SELECT * FROM bookings WHERE ref=?').get(String(req.params.ref).toUpperCase());
  if (!b) return res.redirect(L('/booking'));
  const modeTxt = b.mode === 'mobile' ? `${t('f_mobile')}${b.location ? ' · ' + b.location : ''}` : t('f_studio');
  const msg = [`${t('wa_hello')}`, `${t('conf_ref')}: ${b.ref}`, `${t('f_service')}: ${b.service_name}`, `${t('f_name')}: ${b.name}`, `${t('f_phone')}: ${b.phone}`, `${t('f_date')}: ${b.date}`, `${t('f_time')}: ${b.time}`, `${t('s_mode')}: ${modeTxt}`, b.details ? `${t('f_details')}: ${b.details}` : ''].filter(Boolean).join('\n');
  const wa = waLink(msg);
  const row = (k, v) => `<div><dt>${t(k)}</dt><dd>${esc(v)}</dd></div>`;
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('conf_title')}</p><h1>${t('conf_head', { name: esc(b.name.split(' ')[0]) })}</h1><p class="lead">${t('conf_text')}</p></div></header>
<div class="wrap conf">
  <dl class="summary"><h2>${t('conf_summary')}</h2>${row('conf_ref', b.ref)}${row('f_service', b.service_name)}${row('f_date', b.date)}${row('f_time', b.time)}${row('s_mode', modeTxt)}</dl>
  <div class="conf-act">${wa ? `<a class="btn btn-gold" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 'ic-sm')} ${t('conf_wa_btn')}</a><p class="note">${t('conf_wa_note')}</p>` : `<p class="note">${t('conf_no_wa')}</p>`}
    <p><a class="btn btn-line" href="${L('/booking')}">${t('conf_another')}</a> <a class="btn btn-line" href="${L('/')}">${t('conf_home')}</a></p></div>
</div>`;
  res.setHeader('Cache-Control', 'no-store');
  page(req, res, { body, path: '/booking', title: t('conf_title'), noindex: true });
});

/* ───────── contact ───────── */
const DAYKEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
function contactPage(req, res, o = {}) {
  const { lang, t, S } = req.ctx;
  const tok = publicCsrf(req, res), v = o.values || {}, er = o.errors || {};
  let hours = []; try { hours = JSON.parse(S.hours); } catch { /* ignore */ }
  const hrs = DAYKEYS.map((d, i) => ({ d: t('days')[i], x: ((hours.find((h) => h.day === d) || {}).text || '').trim() })).filter((h) => h.x || hours.some((x) => (x.text || '').trim()));
  const tel = telLink(), wa = waLink(t('wa_hello_generic'));
  const map = `https://www.google.com/maps?q=${encodeURIComponent(S.maps_query || S.address)}&output=embed`, mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.maps_query || S.address)}`;
  const f = (id, label, input) => `<div class="field ${er[id] ? 'has-err' : ''}"><label for="${id}">${label}</label>${input}${er[id] ? `<p class="err">${esc(er[id])}</p>` : ''}</div>`;
  const pre = o.sent ? '' : (req.query.quote ? (lang === 'yo' ? 'Mo fẹ́ béèrè fún ìṣirò fún iṣẹ́ kan: ' : 'I would like a quotation for: ') : '');
  const body = `
<header class="page-head"><div class="wrap"><p class="eyebrow dark">${t('nav_contact')}</p><h1>${t('contact_title')}</h1><p class="lead">${t('contact_intro')}</p></div></header>
<div class="wrap contact-grid">
  <div class="contact-info">
    <div class="btns">${tel ? `<a class="btn btn-dark" href="${tel}">${icon('phone', 'ic-sm')} ${t('call_now')}</a>` : ''}${wa ? `<a class="btn btn-gold" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 'ic-sm')} ${t('whatsapp_us')}</a>` : ''}</div>
    <h2>${t('c_visit')}</h2>
    <dl class="info"><div><dt>${t('c_address')}</dt><dd>${esc(S.address)}</dd></div>
    ${tel ? `<div><dt>${t('c_phone')}</dt><dd><a href="${tel}">${esc(S.phone)}</a></dd></div>` : ''}
    ${S.email ? `<div><dt>${t('c_email')}</dt><dd><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></dd></div>` : ''}</dl>
    ${hrs.length ? `<h2>${t('c_hours')}</h2><table class="hours"><tbody>${hrs.map((h) => `<tr><th scope="row">${esc(h.d)}</th><td>${esc(h.x || t('c_hours_closed'))}</td></tr>`).join('')}</tbody></table>` : ''}
    ${ui.socials(S) ? `<h2>${t('c_follow')}</h2><div class="socials dark">${ui.socials(S)}</div>` : ''}
  </div>
  <div class="contact-form">
    ${o.sent ? `<div class="thanks" role="status"><h2>${t('c_thanks_title')}</h2><p>${t('c_thanks_text', { name: esc(o.sent) })}</p></div>` : `
    <h2>${t('c_form_title')}</h2>
    <form class="form" method="post" action="${req.ctx.L('/contact')}" novalidate>
      <input type="hidden" name="_csrf" value="${tok}">
      <div class="hp" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>
      ${o.formError ? `<p class="form-err" role="alert">${esc(o.formError)}</p>` : ''}
      ${f('name', t('f_name'), `<input id="name" name="name" autocomplete="name" required maxlength="80" value="${esc(v.name || '')}">`)}
      <div class="two">${f('phone', `${t('f_phone')}`, `<input id="phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" maxlength="24" value="${esc(v.phone || '')}">`)}${f('email', t('f_email'), `<input id="email" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(v.email || '')}">`)}</div>
      ${f('message', t('f_message'), `<textarea id="message" name="message" rows="6" maxlength="2000" required>${esc(v.message || pre)}</textarea>`)}
      <button class="btn btn-gold" type="submit" data-busy="${t('f_sending')}">${t('c_send')}</button>
    </form>`}
  </div>
</div>
<div class="wrap map-wrap"><iframe title="${esc(t('c_map_title'))}" src="${esc(map)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe><a class="more" href="${esc(mapLink)}" target="_blank" rel="noopener noreferrer">${t('c_open_maps')} →</a></div>`;
  page(req, res, { body, path: '/contact', title: t('contact_title'), scripts: ['/js/forms.js?v=1'] });
}
router.get('/contact', (req, res) => contactPage(req, res));
router.post('/contact', express.urlencoded({ extended: false, limit: '20kb' }), (req, res) => {
  const { t, L } = req.ctx, b = req.body || {};
  if (clean(b.website, 50)) return res.redirect(L('/contact'));
  const values = { name: clean(b.name, 80), phone: clean(b.phone, 24), email: clean(b.email, 120), message: clean(b.message, 2000) };
  if (!checkPublicCsrf(req)) return contactPage(req, res.status(400), { values, formError: t('err_security') });
  if (limited('contact:' + ip(req), 6, 3600e3)) return contactPage(req, res.status(429), { values, formError: t('err_many') });
  const errors = {};
  if (values.name.length < 2) errors.name = t('err_name');
  if (values.message.length < 3) errors.message = t('err_message');
  const okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email);
  if (values.email && !okEmail) errors.email = t('err_contact');
  if (!errors.email && !values.email && !validPhone(values.phone)) errors.phone = t('err_contact');
  if (values.phone && !validPhone(values.phone)) errors.phone = t('err_phone');
  if (Object.keys(errors).length) return contactPage(req, res.status(422), { values, errors, formError: t('err_fix') });
  db.prepare('INSERT INTO enquiries(name,phone,email,message,created) VALUES (?,?,?,?,?)').run(values.name, values.phone, values.email, values.message, Date.now());
  contactPage(req, res, { sent: values.name.split(' ')[0] });
});

module.exports = { router, langMiddleware, page };
