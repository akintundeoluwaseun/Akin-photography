/* Akin Photography: header, mobile menu, scroll reveals. No dependencies. */
(function () {
  'use strict';
  var doc = document, body = doc.body, header = doc.querySelector('.site-header');
  var burger = doc.querySelector('.burger'), nav = doc.getElementById('nav');

  function onScroll() { if (header) header.classList.toggle('solid', window.scrollY > 40); }
  onScroll(); window.addEventListener('scroll', onScroll, { passive: true });

  function setMenu(open) { body.classList.toggle('nav-open', open); if (burger) burger.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  if (burger && nav) {
    burger.addEventListener('click', function () { setMenu(!body.classList.contains('nav-open')); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && body.classList.contains('nav-open')) { setMenu(false); burger.focus(); } });
    window.matchMedia('(min-width: 981px)').addEventListener('change', function (m) { if (m.matches) setMenu(false); });
  }

  /* ── motion: fade-in images, parallax depth, pointer light, gentle tilt ── */
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches, fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  [].forEach.call(doc.querySelectorAll('main img, .hero-img, .cta-img'), function (im) {
    if (im.complete || im.classList.contains('hero-img')) return;
    im.classList.add('fade-pre'); var done = function () { im.classList.remove('fade-pre'); }; im.addEventListener('load', done); im.addEventListener('error', done);
    setTimeout(done, 4000);
  });
  if (!calm) {
    var px = [].slice.call(doc.querySelectorAll('.hero-img, .cta-img, .about-photo img, .svc-row img')); px.forEach(function (e) { e.classList.add('px'); });
    var tick = false;
    var run = function () {
      tick = false; var vh = window.innerHeight;
      px.forEach(function (e) { var r = e.parentElement.getBoundingClientRect(); if (r.bottom < -100 || r.top > vh + 100) return; var k = ((r.top + r.height / 2) - vh / 2) / vh; e.style.translate = '0 ' + (k * -34).toFixed(1) + 'px'; });
    };
    window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(run); } }, { passive: true }); run();
    var hero = doc.querySelector('.hero');
    if (hero && fine) hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%'); hero.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%'); });
    if (fine) doc.addEventListener('pointermove', function (e) {
      var t = e.target.closest && e.target.closest('.m, .shot'); if (!t) return;
      var r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      t.classList.add('tilt', 'tilting'); t.style.transform = 'perspective(900px) rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg) scale(1.015)';
    });
    doc.addEventListener('pointerout', function (e) { var t = e.target.closest && e.target.closest('.m, .shot'); if (t && !t.contains(e.relatedTarget)) { t.classList.remove('tilting'); t.style.transform = ''; } });
  }

  var items = [].slice.call(doc.querySelectorAll('.reveal'));
  if (!('IntersectionObserver' in window) || !items.length) return;
  var vh = window.innerHeight;
  doc.documentElement.classList.add('reveal-ready');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
  items.forEach(function (el, i) {
    if (el.getBoundingClientRect().top < vh) el.classList.add('in');   // already on screen: no flash
    else { el.style.transitionDelay = Math.min(i % 4, 3) * 70 + 'ms'; io.observe(el); }
  });
})();
