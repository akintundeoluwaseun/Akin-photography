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
