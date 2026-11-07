'use strict';
const { settings } = require('./db');
const { CATEGORIES } = require('./content');
const images = require('./images');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SITE = 'Akin Photography';
const CREDIT_URL = process.env.CREDIT_URL || 'https://oluwaseun-joshua-site.vercel.app/';

function baseUrl(req) {
  const env = process.env.SITE_URL;
  if (env) return env.replace(/\/$/, '');
  return `${req.protocol}://${req.get('host')}`;
}

/* contact helpers: never produce a link from an empty or invalid number */
function digits(n) {
  let d = String(n || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2); else if (d.startsWith('0') && d.length === 11) d = '234' + d.slice(1);
  return /^\d{9,15}$/.test(d) ? d : '';
}
const waNumber = () => digits(settings().whatsapp);
const waLink = (text) => { const n = waNumber(); return n ? `https://wa.me/${n}?text=${encodeURIComponent(text || '')}` : ''; };
const telLink = () => { const n = digits(settings().phone); return n ? `tel:+${n}` : ''; };
const money = (S, n) => `${S.currency || '₦'}${Number(n).toLocaleString('en-NG')}`;

const ICONS = {
  instagram: '<path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.2-1.7a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/>',
  facebook: '<path d="M14 8V6.4c0-.8.2-1.4 1.4-1.4H17V2h-2.6C11.5 2 10 3.700 10 6.200V8H7.500v3H10v10h4V11h2.600l.4-3H14Z"/>',
  tiktok: '<path d="M16.500 3c.3 2.300 1.600 3.700 3.800 3.900v3.100c-1.400.1-2.700-.3-3.800-1.100v5.800c0 3.700-2.900 5.800-5.700 5.800A5.600 5.600 0 0 1 5.200 14.900c0-3.500 3-5.900 6.500-5.400v3.200c-1.600-.5-3.300.5-3.300 2.200 0 1.400 1.100 2.400 2.400 2.400 1.600 0 2.500-1 2.500-2.800V3h3.200Z"/>',
  x: '<path d="M17.800 3h3l-6.600 7.600L22 21h-6.100l-4.800-6.200L5.600 21h-3l7-8.100L2.300 3h6.200l4.300 5.700L17.800 3Zm-1.100 16.200h1.700L7.600 4.700H5.800l10.900 14.500Z"/>',
  youtube: '<path d="M21.600 7.200a2.500 2.500 0 0 0-1.800-1.800C18.200 5 12 5 12 5s-6.200 0-7.800.4A2.500 2.500 0 0 0 2.400 7.200C2 8.800 2 12 2 12s0 3.200.4 4.800a2.500 2.500 0 0 0 1.800 1.800C5.800 19 12 19 12 19s6.200 0 7.800-.4a2.500 2.500 0 0 0 1.800-1.800C22 15.200 22 12 22 12s0-3.200-.4-4.800ZM10 15V9l5.200 3L10 15Z"/>',
  whatsapp: '<path d="M12 2a10 10 0 0 0-8.600 15.100L2 22l5-1.300A10 10 0 1 0 12 2Zm5.200 14.200c-.2.600-1.300 1.200-1.800 1.200-.5.100-1 .2-3.300-.7-2.800-1.100-4.600-4-4.700-4.200-.1-.2-1.100-1.500-1.100-2.800s.7-2 1-2.300c.2-.3.500-.3.700-.3h.5c.2 0 .4 0 .6.500l.9 2.100c.1.200.1.400 0 .5l-.4.600c-.1.200-.3.300-.1.600.2.300.8 1.300 1.700 2.100 1.200 1 2.100 1.300 2.400 1.500.3.100.4.100.6-.1l.8-1c.2-.3.400-.2.600-.1l2 .9c.3.100.5.200.5.300.1.200.1.800-.1 1.400Z"/>',
  phone: '<path d="M6.600 10.800a15 15 0 0 0 6.600 6.600l2.200-2.200a1 1 0 0 1 1-.2c1.100.4 2.300.6 3.600.6a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.500a1 1 0 0 1 1 1c0 1.300.2 2.500.6 3.600a1 1 0 0 1-.2 1l-2.300 2.200Z"/>',
};
const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">${ICONS[n] || ''}</svg>`;

/* a photograph as responsive markup. Real uploads get srcset; sample tiles are generated SVGs */
function tile(img) {
  const alt = img.title || '';
  if (img.sample) return { id: null, sample: true, cat: img.category, alt, w: img.w, h: img.h, src: `/ph/${img.category}/${img.n}.svg`, srcset: '', full: `/ph/${img.category}/${img.n}.svg` };
  const av = images.available(img.id);
  const best = av.length ? av[av.length - 1] : 480;
  return {
    id: img.id, sample: false, cat: img.category, alt, w: img.w, h: img.h,
    src: `/media/${img.id}-${av.includes(960) ? 960 : av[0] || 480}.webp`,
    srcset: av.map((w) => `/media/${img.id}-${w}.webp ${w}w`).join(', '),
    full: `/media/${img.id}-${best}.webp`,
  };
}
const SAMPLE_SET = [
  ['portraits', 800, 1000], ['events', 1000, 700], ['studio', 800, 1000], ['outdoor', 1000, 667], ['passport', 800, 800], ['commercial', 1000, 750],
  ['portraits', 800, 1066], ['outdoor', 800, 1000], ['events', 800, 1000], ['studio', 1000, 800], ['commercial', 800, 1000], ['portraits', 1000, 700],
];
function sampleImages() { return SAMPLE_SET.map(([category, w, h], i) => ({ id: -(i + 1), n: i + 1, sample: true, category, w, h, title: '', featured: i < 6 })); }

function img(t, cls = '', sizes = '100vw', eager = false) {
  return `<img class="${cls}" src="${t.src}" ${t.srcset ? `srcset="${t.srcset}" sizes="${sizes}"` : ''} width="${t.w}" height="${t.h}" alt="${esc(t.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

function socials(S) {
  return [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['x', 'X'], ['youtube', 'YouTube']]
    .filter(([k]) => /^https?:\/\//i.test(S[k] || '')).map(([k, n]) => `<a href="${esc(S[k])}" target="_blank" rel="noopener noreferrer" aria-label="${n}">${icon(k)}</a>`).join('');
}

function layout(req, o) {
  const { t, L, S } = req.ctx;
  const base = baseUrl(req);
  const path = o.path || '/';
  const title = o.title ? `${o.title} · ${SITE}` : `${SITE} · Ado-Ekiti`;
  const desc = o.desc || S.seo_desc;
  const og = o.ogImage ? base + o.ogImage : `${base}/og-default.svg`;
  const self = path;
  const wa = waLink(t('wa_hello_generic')), tel = telLink();
  const nav = [['/', 'nav_home'], ['/about', 'nav_about'], ['/services', 'nav_services'], ['/portfolio', 'nav_portfolio'], ['/pricing', 'nav_pricing'], ['/contact', 'nav_contact']];
  const active = (p) => (p === path ? ' aria-current="page"' : '');
  const services = o._services || [];
  const ld = {
    '@context': 'https://schema.org', '@type': 'PhotographyBusiness', name: SITE, url: base,
    address: { '@type': 'PostalAddress', streetAddress: 'Onala Street', addressLocality: 'Ado-Ekiti', addressRegion: 'Ekiti State', addressCountry: 'NG' },
    ...(digits(S.phone) ? { telephone: '+' + digits(S.phone) } : {}), ...(S.email ? { email: S.email } : {}),
    ...(['instagram', 'facebook', 'tiktok', 'x', 'youtube'].map((k) => S[k]).filter((u) => /^https?:\/\//.test(u || '')).length ? { sameAs: ['instagram', 'facebook', 'tiktok', 'x', 'youtube'].map((k) => S[k]).filter((u) => /^https?:\/\//.test(u || '')) } : {}),
  };
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(base + self)}">
${o.noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website"><meta property="og:site_name" content="${SITE}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(base + self)}"><meta property="og:image" content="${esc(og)}"><meta property="og:locale" content="en_NG">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0d0c0b">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap">
<link rel="stylesheet" href="/css/site.css?v=1">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="${o.home ? 'is-home' : ''}">
<a class="skip" href="#main">${t('skip')}</a>
<header class="site-header" id="top">
  <a class="brand" href="${L('/')}" aria-label="${SITE}"><span class="brand-a">AKIN</span><span class="brand-b">PHOTOGRAPHY</span></a>
  <nav id="nav" class="nav" aria-label="Main">
    ${nav.map(([p, k]) => `<a href="${L(p)}"${active(p)}>${t(k)}</a>`).join('')}
    <a class="nav-book" href="${L('/booking')}">${t('nav_book')}</a>
  </nav>
  <div class="head-tools">
    <button class="burger" aria-expanded="false" aria-controls="nav" aria-label="${t('menu')}"><span></span><span></span></button>
  </div>
</header>
<main id="main">${o.body}</main>
<footer class="site-footer">
  <div class="foot-grid">
    <div><a class="brand brand-foot" href="${L('/')}"><span class="brand-a">AKIN</span><span class="brand-b">PHOTOGRAPHY</span></a><p>${t('foot_tag')}</p>
      <div class="socials">${socials(S)}</div></div>
    <div><h3>${t('foot_nav')}</h3><ul>${nav.slice(1).map(([p, k]) => `<li><a href="${L(p)}">${t(k)}</a></li>`).join('')}<li><a href="${L('/booking')}">${t('nav_book')}</a></li></ul></div>
    <div><h3>${t('foot_services')}</h3><ul>${services.map((s) => `<li><a href="${L('/services')}#${esc(s.slug)}">${esc(s.name)}</a></li>`).join('')}</ul></div>
    <div><h3>${t('foot_contact')}</h3><ul class="foot-contact">
      <li>${esc(S.address)}</li>
      ${tel ? `<li><a href="${tel}">${esc(S.phone)}</a></li>` : ''}
      ${S.email ? `<li><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></li>` : ''}
      ${wa ? `<li><a href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${icon('whatsapp', 'ic-sm')} WhatsApp</a></li>` : ''}</ul></div>
  </div>
  <p class="copy"><span>© ${new Date().getFullYear()} ${SITE}. ${t('foot_rights')}</span><a class="built-by" href="${esc(CREDIT_URL)}" target="_blank" rel="noopener" aria-label="Built by Oluwaseun. Opens his portfolio in a new tab" title="Website by Oluwaseun"><span class="built-by__icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg></span><span class="built-by__text">Built by <strong>Oluwaseun</strong></span></a></p>
</footer>
${wa ? `<a class="wa-float" href="${esc(wa)}" target="_blank" rel="noopener noreferrer" aria-label="${t('wa_float')}">${icon('whatsapp')}</a>` : ''}
<script src="/js/site.js?v=1" defer></script>
${(o.scripts || []).map((s) => `<script src="${s}" defer></script>`).join('')}
</body></html>`;
}

module.exports = { esc, layout, tile, img, sampleImages, icon, waLink, telLink, digits, money, socials, baseUrl, SITE, CATEGORIES };
