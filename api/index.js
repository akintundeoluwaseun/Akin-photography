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
    try { await booting; } catch (e) { booting = null; console.error('boot failed:', e); res.statusCode = 500; return res.end('The site is starting up. Please refresh in a moment.'); }
  }
  return app(req, res);
};
