'use strict';
// Plain check page: open /api/health to see what this server can load. Safe to leave in place (shows no secrets).
module.exports = (req, res) => {
  const out = ['node ' + process.version + ' ' + process.platform + '/' + process.arch, 'vercel=' + !!process.env.VERCEL, 'token set=' + !!process.env.GITHUB_TOKEN, 'cwd=' + process.cwd()];
  const t = (name, fn) => { try { out.push('OK   ' + name + (fn() || '')); } catch (e) { out.push('FAIL ' + name + ': ' + String((e && e.message) || e).split('\n')[0].slice(0, 300)); } };
  t('better-sqlite3', () => { const D = require('better-sqlite3'); const d = new D(':memory:'); return ' ' + d.prepare('select sqlite_version() v').get().v; });
  t('sharp', () => ' ' + require('sharp').versions.sharp);
  t('express', () => ' ' + require('express/package.json').version);
  t('web-push', () => { require('web-push'); });
  t('write /tmp', () => { require('fs').writeFileSync('/tmp/_h', '1'); });
  t('public folder', () => ' ' + require('fs').readdirSync('public').length + ' items');
  t('seed photos', () => ' ' + require('fs').readdirSync('seed/photos').length + ' files');
  t('load app', () => { const a = require('../server.js'); return typeof a === 'function' ? '' : ' (not a function)'; });
  res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(out.join('\n') + '\n');
};
