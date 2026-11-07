/* Portfolio: instant category filtering and a full-screen viewer with keyboard and swipe. */
(function () {
  'use strict';
  var doc = document, lang = doc.body.getAttribute('data-lang');
  var of = lang === 'yo' ? 'nínú' : 'of';
  var grid = doc.getElementById('masonry'), filters = doc.querySelector('.filters'), empty = doc.getElementById('gallery-empty');
  if (!grid) return;
  var shots = [].slice.call(grid.querySelectorAll('.shot'));

  function apply(cat, push) {
    var n = 0;
    shots.forEach(function (s) { var show = !cat || s.getAttribute('data-cat') === cat; s.hidden = !show; if (show) n++; });
    [].forEach.call(filters.querySelectorAll('a'), function (a) { if (a.getAttribute('data-cat') === cat) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    empty.hidden = n > 0;
    if (push) history.replaceState(null, '', cat ? '?cat=' + cat : location.pathname);
  }
  filters.addEventListener('click', function (e) {
    var a = e.target.closest('a'); if (!a) return;
    e.preventDefault(); apply(a.getAttribute('data-cat'), true);
  });

  var v = doc.getElementById('viewer'), vi = v.querySelector('img'), cap = v.querySelector('figcaption'), count = v.querySelector('.v-count');
  var list = [], idx = 0, opener = null;
  function visible() { return shots.filter(function (s) { return !s.hidden; }); }
  function show(i) {
    idx = (i + list.length) % list.length; var s = list[idx];
    vi.style.opacity = 0;
    var next = new Image(); next.onload = function () { vi.src = next.src; vi.alt = s.getAttribute('data-alt') || ''; vi.style.opacity = 1; };
    next.src = s.getAttribute('data-full'); cap.textContent = s.getAttribute('data-alt') || '';
    count.textContent = (idx + 1) + ' ' + of + ' ' + list.length;
    var pre = list[(idx + 1) % list.length]; if (pre) (new Image()).src = pre.getAttribute('data-full');
  }
  function open(s) { list = visible(); opener = s.querySelector('a'); v.hidden = false; doc.body.style.overflow = 'hidden'; show(list.indexOf(s)); v.querySelector('.v-close').focus(); }
  function close() { v.hidden = true; doc.body.style.overflow = ''; if (opener) opener.focus(); }
  grid.addEventListener('click', function (e) { var s = e.target.closest('.shot'); if (!s) return; e.preventDefault(); open(s); });
  v.querySelector('.v-close').addEventListener('click', close);
  v.querySelector('.v-prev').addEventListener('click', function () { show(idx - 1); });
  v.querySelector('.v-next').addEventListener('click', function () { show(idx + 1); });
  v.addEventListener('click', function (e) { if (e.target === v) close(); });
  doc.addEventListener('keydown', function (e) {
    if (v.hidden) return;
    if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(idx - 1); else if (e.key === 'ArrowRight') show(idx + 1);
    else if (e.key === 'Tab') { var f = [].slice.call(v.querySelectorAll('button')), first = f[0], last = f[f.length - 1]; if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); } }
  });
  var x0 = null; v.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  v.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1)); x0 = null; });
})();
