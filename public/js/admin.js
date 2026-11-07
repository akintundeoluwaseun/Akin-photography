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
    var selAll = function () { picks().forEach(function (p) { p.checked = true; }); refresh(); };
    doc.getElementById('sel-all').addEventListener('click', selAll);
    doc.getElementById('sel-all-top').addEventListener('click', selAll);
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


  /* ── upload: shrink big phone photos in the browser and send one at a time (keeps each request small enough for the host) ── */
  var upForm = doc.querySelector('form.upload');
  if (upForm && window.fetch && window.FormData && window.createImageBitmap) {
    var shrink = function (file) {
      if (file.size < 1500000 && /jpeg|webp/.test(file.type)) return Promise.resolve(file);
      return createImageBitmap(file).then(function (bm) {
        var s = Math.min(1, 2200 / Math.max(bm.width, bm.height)), c = doc.createElement('canvas');
        c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s);
        c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
        return new Promise(function (res) { c.toBlob(function (b) { res(b || file); }, 'image/jpeg', 0.86); });
      }).catch(function () { return file; });
    };
    upForm.addEventListener('submit', function (e) {
      var input = upForm.querySelector('input[type=file]'), files = [].slice.call(input.files || []);
      if (!files.length) return;
      e.preventDefault();
      var btn = upForm.querySelector('button'), cat = upForm.querySelector('select').value, ok = 0, bad = 0, i = 0;
      btn.disabled = true;
      (function next() {
        if (i >= files.length) { toast(ok + ' uploaded' + (bad ? ', ' + bad + ' failed' : '')); setTimeout(function () { location.href = '/admin/gallery'; }, 700); return; }
        btn.textContent = 'Uploading ' + (i + 1) + ' of ' + files.length + '…';
        shrink(files[i]).then(function (blob) {
          var fd = new FormData(); fd.append('_csrf', csrf || upForm.querySelector('[name=_csrf]').value); fd.append('category', cat); fd.append('photos', blob, 'photo.jpg');
          return fetch('/admin/gallery/upload', { method: 'POST', body: fd, credentials: 'same-origin', redirect: 'manual' });
        }).then(function (r) { if (r.type === 'opaqueredirect' || r.ok) ok++; else bad++; }).catch(function () { bad++; }).then(function () { i++; next(); });
      })();
    });
  }

  /* ── phone / computer alerts (Web Push, work even when the browser is closed) ── */
  var last = Number(doc.body.getAttribute('data-total')) || 0, baseTitle = doc.title;
  var alertsBtn = doc.getElementById('alerts'), card = doc.getElementById('push-card');
  var msgEl = doc.getElementById('push-msg'), onBtn = doc.getElementById('push-on'), testBtn = doc.getElementById('push-test');
  var canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  function b64(s) { var p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  function post(url, body) { return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify(body || {}) }); }
  /* register the worker and wait until it is active (the page at /admin sits outside the /admin/ scope, so .ready would never fire there) */
  function getReg() {
    return navigator.serviceWorker.register('/admin/sw.js', { scope: '/admin/' }).then(function (reg) {
      if (reg.active) return reg;
      var w = reg.installing || reg.waiting;
      if (!w) return reg;
      return new Promise(function (resolve) { w.addEventListener('statechange', function () { if (w.state === 'activated') resolve(reg); }); if (w.state === 'activated') resolve(reg); });
    });
  }
  function state(on, text, noEnable) {
    if (alertsBtn) { alertsBtn.hidden = !canPush || (!!noEnable && !on); alertsBtn.classList.toggle('on', on); alertsBtn.textContent = on ? '🔔 Alerts on (tap to test)' : '🔔 Turn on phone alerts'; }
    if (msgEl) msgEl.textContent = text;
    if (onBtn) onBtn.hidden = on || !canPush || !!noEnable;
    if (testBtn) testBtn.hidden = !on;
  }
  function refresh() {
    if (!canPush) { state(false, 'This browser cannot receive alerts. On an iPhone, add this admin to your Home Screen first (see below), then open it from there.', true); return Promise.resolve(); }
    return getReg()
      .then(function (reg) {
        if (Notification.permission === 'denied') return state(false, 'Alerts are blocked for this site. Allow notifications in your browser settings for this address, then reload this page.', true);
        return reg.pushManager.getSubscription().then(function (sub) {
          if (!sub) return state(false, 'Alerts are off on this device. Turn them on to be told the moment someone sends a booking or message.');
          return post('/admin/push/subscribe', sub.toJSON()).then(function () { state(true, 'Alerts are on for this device. You will be notified of new bookings and messages, even when the browser is closed.'); });
        });
      }).catch(function () { state(false, 'Could not set up alerts here. Make sure the site is opened on its secure (https) address.', true); });
  }
  function enable() {
    if (!canPush) return;
    Notification.requestPermission().then(function (perm) {
      if (perm !== 'granted') return refresh();
      return getReg()
        .then(function (reg) {
          return fetch('/admin/push/key', { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (k) {
            return reg.pushManager.getSubscription().then(function (sub) { return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(k.key) }); });
          });
        }).then(function (sub) { return post('/admin/push/subscribe', sub.toJSON()); })
        .then(function () { return refresh(); }).then(function () { toast('Alerts are on. Sending a test…'); return sendTest(); });
    }).catch(function () { toast('Could not turn on alerts on this device.'); });
  }
  function sendTest() { return post('/admin/push/test').then(function (r) { return r.json(); }).then(function (r) { if (!r.sent) toast('Test could not be delivered. Try turning alerts off and on again.'); }).catch(function () { toast('Test could not be sent.'); }); }
  if (onBtn) onBtn.addEventListener('click', enable);
  if (testBtn) testBtn.addEventListener('click', sendTest);
  if (alertsBtn) alertsBtn.addEventListener('click', function () { if (alertsBtn.classList.contains('on')) sendTest(); else enable(); });
  if (alertsBtn || card) refresh();

  function setPill(key, n) { doc.querySelectorAll('[data-pill="' + key + '"]').forEach(function (p) { p.textContent = n || ''; p.hidden = !n; }); }
  function poll() {
    if (doc.hidden) return;
    fetch('/admin/api/counts', { credentials: 'same-origin', headers: { Accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (c) {
      if (!c) return;
      var total = c.b + c.e; setPill('b', c.b); setPill('e', c.e); setPill('t', total);
      doc.title = (total ? '(' + total + ') ' : '') + baseTitle.replace(/^\(\d+\) /, '');
      if (total > last) {
        var msg = 'New booking request or message';
        toast(msg + '. Open the inbox.', '/admin/bookings');
      }
      last = total;
    }).catch(function () { /* offline: try again next time */ });
  }
  setInterval(poll, 30000);
})();
