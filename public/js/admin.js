/* Admin: confirmations, photo selecting and reordering, new-request alerts. No dependencies. */
(function () {
  'use strict';
  var doc = document;
  var csrf = (doc.querySelector('meta[name="csrf"]') || {}).content || '';

  function toast(text, href) {
    var t = doc.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status');
    if (href) { var a = doc.createElement('a'); a.href = href; a.textContent = text; t.appendChild(a); } else t.textContent = text;
    doc.body.appendChild(t); setTimeout(function () { t.remove(); }, 6000);
  }

  doc.addEventListener('submit', function (e) {
    var m = e.target.getAttribute && e.target.getAttribute('data-confirm');
    if (m && !window.confirm(m)) e.preventDefault();
  });
  doc.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-confirm-btn]');
    if (b && !window.confirm(b.getAttribute('data-confirm-btn'))) e.preventDefault();
  });

  /* ── gallery: select, reorder ── */
  var grid = doc.getElementById('ph-grid');
  if (grid) {
    var bar = doc.getElementById('bulk'), nEl = doc.getElementById('bulk-n');
    var picks = function () { return [].slice.call(grid.querySelectorAll('.pick')); };
    var refresh = function () { var n = picks().filter(function (p) { return p.checked; }).length; nEl.textContent = n; bar.hidden = n === 0; };
    grid.addEventListener('change', function (e) { if (e.target.classList.contains('pick')) refresh(); });
    doc.getElementById('sel-all').addEventListener('click', function () { picks().forEach(function (p) { p.checked = true; }); refresh(); });
    doc.getElementById('sel-none').addEventListener('click', function () { picks().forEach(function (p) { p.checked = false; }); refresh(); });

    var save = function () {
      var ids = [].slice.call(grid.querySelectorAll('.ph')).map(function (c) { return Number(c.getAttribute('data-id')); });
      fetch('/admin/gallery/reorder', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ ids: ids }) })
        .then(function (r) { toast(r.ok ? 'Order saved' : 'Could not save the order. Reload and try again.'); })
        .catch(function () { toast('Could not save the order. Check your connection.'); });
    };
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.mv'); if (!b) return;
      var card = b.closest('.ph'), d = Number(b.getAttribute('data-d'));
      var other = d < 0 ? card.previousElementSibling : card.nextElementSibling;
      if (!other) return;
      if (d < 0) grid.insertBefore(card, other); else grid.insertBefore(other, card);
      save(); b.focus();
    });
    var drag = null;
    grid.addEventListener('dragstart', function (e) { var c = e.target.closest && e.target.closest('.ph'); if (!c) return; drag = c; c.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', c.getAttribute('data-id')); } catch (x) { /* ignore */ } });
    grid.addEventListener('dragover', function (e) {
      if (!drag) return; e.preventDefault();
      var over = e.target.closest('.ph'); grid.querySelectorAll('.over').forEach(function (o) { o.classList.remove('over'); });
      if (over && over !== drag) over.classList.add('over');
    });
    grid.addEventListener('drop', function (e) {
      if (!drag) return; e.preventDefault();
      var over = e.target.closest('.ph');
      if (over && over !== drag) {
        var kids = [].slice.call(grid.children);
        if (kids.indexOf(drag) < kids.indexOf(over)) grid.insertBefore(drag, over.nextSibling); else grid.insertBefore(drag, over);
        save();
      }
    });
    grid.addEventListener('dragend', function () { if (drag) drag.classList.remove('drag'); grid.querySelectorAll('.over').forEach(function (o) { o.classList.remove('over'); }); drag = null; });
  }

  /* ── new booking / enquiry alerts ── */
  var last = Number(doc.body.getAttribute('data-total')) || 0, baseTitle = doc.title;
  var alertsBtn = doc.getElementById('alerts');
  if (alertsBtn && 'Notification' in window && Notification.permission === 'default') {
    alertsBtn.hidden = false;
    alertsBtn.addEventListener('click', function () { Notification.requestPermission().then(function () { alertsBtn.hidden = true; if (Notification.permission === 'granted') toast('Alerts are on while this page is open.'); }); });
  }
  function setPill(key, n) { doc.querySelectorAll('[data-pill="' + key + '"]').forEach(function (p) { p.textContent = n || ''; p.hidden = !n; }); }
  function poll() {
    if (doc.hidden && !('Notification' in window && Notification.permission === 'granted')) return;
    fetch('/admin/api/counts', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      if (!c) return;
      var total = c.b + c.e; setPill('b', c.b); setPill('e', c.e); setPill('t', total);
      doc.title = (total ? '(' + total + ') ' : '') + baseTitle.replace(/^\(\d+\) /, '');
      if (total > last) {
        var msg = c.b > 0 && total - last > 0 ? 'New booking request or message' : 'New message';
        toast(msg + '. Open the inbox.', '/admin/bookings');
        if ('Notification' in window && Notification.permission === 'granted' && doc.hidden) { try { new Notification('Akin Photography', { body: msg }); } catch (x) { /* ignore */ } }
      }
      last = total;
    }).catch(function () { /* offline: try again next time */ });
  }
  setInterval(poll, 30000);
})();
