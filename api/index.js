'use strict';
// Vercel entry point. On a cold start, first restore the saved data from the repository (branch "data"), then hand every request to the Express app.
let app = null, booting = null;
module.exports = async (req, res) => {
  if (!app) {
    booting = booting || (async () => {
      await require('../lib/remote').restore();
      const a = require('../server.js');
      await a.ready;
      app = a;
    })();
    try { await booting; } catch (e) { booting = null; console.error('boot failed:', e); res.statusCode = 500; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); return res.end('The site could not start.\n\nReason: ' + String((e && e.message) || e).slice(0, 600)); }
  }
  return app(req, res);
};
