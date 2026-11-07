'use strict';
/* Web Push: alerts that reach the owner's phone or computer even when the site and browser are closed.
   VAPID keys are created once and kept in the database (or taken from VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). */
const crypto = require('crypto');
/* web-push is an ES module: load it only when sending (require() of it fails on some hosts) */
let wp = null;
const loadWp = async () => { if (!wp) { const m = await import('web-push'); wp = m.default || m; } return wp; };
function vapidPair() {
  const e = crypto.createECDH('prime256v1'); e.generateKeys();
  return { publicKey: e.getPublicKey().toString('base64url'), privateKey: e.getPrivateKey().toString('base64url') };
}
const { db } = require('./db');

let ready = null;
function keys() {
  if (ready) return ready;
  let pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    const r = db.prepare("SELECT value FROM kv WHERE key='vapid'").get();
    if (r) ({ pub, priv } = JSON.parse(r.value));
    else { const k = vapidPair(); pub = k.publicKey; priv = k.privateKey; db.prepare("INSERT INTO kv(key,value) VALUES('vapid',?)").run(JSON.stringify({ pub, priv })); }
  }
  const site = process.env.SITE_URL || '';
  const subject = /^https:\/\//.test(site) ? site : 'mailto:' + (process.env.ADMIN_EMAIL || 'owner@akinphotography.com');
  return (ready = { pub, priv, subject });
}
const publicKey = () => keys().pub;
const count = () => db.prepare('SELECT COUNT(*) c FROM push_subs').get().c;

function save(sub) {
  const ep = sub && String(sub.endpoint || ''), k = sub && sub.keys || {};
  if (!/^https:\/\/[^\s]{10,1000}$/.test(ep) || typeof k.p256dh !== 'string' || typeof k.auth !== 'string' || k.p256dh.length > 200 || k.auth.length > 100) return false;
  if (count() >= 20) db.prepare('DELETE FROM push_subs WHERE id=(SELECT MIN(id) FROM push_subs)').run();
  db.prepare('INSERT INTO push_subs(endpoint,p256dh,auth,created) VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh, auth=excluded.auth').run(ep, k.p256dh, k.auth, Date.now());
  return true;
}
const remove = (endpoint) => db.prepare('DELETE FROM push_subs WHERE endpoint=?').run(String(endpoint || ''));

async function notifyAll(msg) {
  let webpush, k;
  try { k = keys(); webpush = await loadWp(); webpush.setVapidDetails(k.subject, k.pub, k.priv); } catch (e) { console.error('push keys:', e.message); return 0; }
  const subs = db.prepare('SELECT * FROM push_subs').all(), payload = JSON.stringify(msg);
  let sent = 0;
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400, urgency: 'high' }); sent++; }
    catch (e) { if (e.statusCode === 404 || e.statusCode === 410) db.prepare('DELETE FROM push_subs WHERE id=?').run(s.id); else console.error('push failed:', e.statusCode || e.message); }
  }));
  return sent;
}
const notify = (msg) => { notifyAll(msg).catch((e) => console.error('push:', e.message)); };
module.exports = { publicKey, save, remove, count, notifyAll, notify };
