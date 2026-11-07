/* Booking and contact forms: show the location field for mobile sessions, and a sending state. */
(function () {
  'use strict';
  var form = document.getElementById('booking-form');
  if (form) {
    var wrap = document.getElementById('loc-wrap'), loc = document.getElementById('location');
    var sync = function () { var m = form.querySelector('input[name=mode]:checked'); var mobile = m && m.value === 'mobile'; wrap.hidden = !mobile; if (loc) loc.required = !!mobile; };
    form.addEventListener('change', function (e) { if (e.target.name === 'mode') sync(); });
    sync();
  }
  [].forEach.call(document.querySelectorAll('form.form'), function (f) {
    f.addEventListener('submit', function () {
      var b = f.querySelector('button[type=submit]');
      if (b && f.checkValidity()) { b.disabled = true; b.textContent = b.getAttribute('data-busy') || '…'; }
    });
  });
})();
