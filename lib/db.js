'use strict';
const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { DEFAULTS, SEED_SERVICES } = require('./content');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
const db = new Database(path.join(DATA_DIR, 'akin.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL, hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, admin_id INTEGER NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name_en TEXT NOT NULL, name_yo TEXT NOT NULL DEFAULT '',
  desc_en TEXT NOT NULL DEFAULT '', desc_yo TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'other',
  price INTEGER, price_mode TEXT NOT NULL DEFAULT 'quote', negotiable INTEGER NOT NULL DEFAULT 0,
  image_id INTEGER, sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS images (
  id INTEGER PRIMARY KEY, category TEXT NOT NULL DEFAULT 'other', title_en TEXT NOT NULL DEFAULT '', title_yo TEXT NOT NULL DEFAULT '',
  w INTEGER NOT NULL, h INTEGER NOT NULL, featured INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '', text_en TEXT NOT NULL, text_yo TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1, sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY, ref TEXT UNIQUE NOT NULL, service_id INTEGER, service_name TEXT NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL,
  date TEXT NOT NULL, time TEXT NOT NULL, mode TEXT NOT NULL, location TEXT NOT NULL DEFAULT '', details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', note TEXT NOT NULL DEFAULT '', lang TEXT NOT NULL DEFAULT 'en', created INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL
);
`);

// first run: services without prices
if (!db.prepare('SELECT COUNT(*) c FROM services').get().c) {
  const ins = db.prepare('INSERT INTO services (slug,name_en,name_yo,desc_en,desc_yo,category,sort) VALUES (?,?,?,?,?,?,?)');
  db.transaction(() => SEED_SERVICES.forEach((s, i) => ins.run(...s, i)))();
}

let cache = null;
function settings() {
  if (cache) return cache;
  const out = { ...DEFAULTS };
  for (const r of db.prepare('SELECT key,value FROM settings').all()) if (r.key in DEFAULTS) out[r.key] = r.value;
  return (cache = out);
}
function setSettings(obj) {
  const up = db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  db.transaction(() => { for (const [k, v] of Object.entries(obj)) if (k in DEFAULTS) up.run(k, String(v ?? '').slice(0, 4000)); })();
  cache = null;
}

const q = {
  services: (all) => db.prepare(`SELECT * FROM services ${all ? '' : 'WHERE active=1'} ORDER BY sort, id`).all(),
  service: (id) => db.prepare('SELECT * FROM services WHERE id=?').get(id),
  images: (cat) => cat ? db.prepare('SELECT * FROM images WHERE category=? ORDER BY sort, id DESC').all(cat) : db.prepare('SELECT * FROM images ORDER BY sort, id DESC').all(),
  featured: () => db.prepare('SELECT * FROM images WHERE featured=1 ORDER BY sort, id DESC LIMIT 9').all(),
  image: (id) => db.prepare('SELECT * FROM images WHERE id=?').get(id),
  testimonials: (all) => db.prepare(`SELECT * FROM testimonials ${all ? '' : 'WHERE active=1'} ORDER BY sort, id`).all(),
};

module.exports = { db, settings, setSettings, q, DATA_DIR };
