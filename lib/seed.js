'use strict';
/* First run only: if the gallery is empty, load the starter photographs in /seed/photos, place them across the site
   (hero, About page, each service, closing banner) and fill the gallery. The owner replaces them from Admin → Gallery. */
const fs = require('node:fs');
const path = require('node:path');
const { db, setSettings } = require('./db');
const images = require('./images');

const DIR = path.join(__dirname, '..', 'seed', 'photos');
// file, category, caption (a plain description, used as alt text), show on home mosaic, where else it is used
const PHOTOS = [
  ['01.jpg', 'other', 'Cameras and lenses laid out on a dark table', 1, { cta: 1, service: 'other' }],
  ['02.jpg', 'events', 'Wedding rings framing a couple kissing on a beach', 1, { service: 'event' }],
  ['03.jpg', 'outdoor', 'An aircraft at night on the airport apron', 1, { service: 'outdoor' }],
  ['04.jpg', 'portraits', 'Black and white portrait of a man holding a film camera to his face', 1, { service: 'passport' }],
  ['05.jpg', 'other', 'A photographer holding a camera at his side', 0, { about: 1, service: 'framing' }],
  ['06.jpg', 'commercial', 'A small figure standing in a spotlight shaped like a clock face', 1, { service: 'commercial' }],
  ['07.jpg', 'studio', 'A man seated on the floor in front of a circle of light', 1, { service: 'studio' }],
  ['08.jpg', 'portraits', 'A man in a white double-breasted blazer in a circle of light', 1, { hero: 1 }],
  ['09.jpg', 'studio', 'A man in a black suit seated on a clear chair in the studio', 1, { service: 'portrait' }],
];

async function seedPhotos() {
  if (db.prepare('SELECT COUNT(*) c FROM images').get().c || !fs.existsSync(DIR)) return;
  const set = {};
  for (let i = 0; i < PHOTOS.length; i++) {
    const [file, category, title, featured, use] = PHOTOS[i];
    const fp = path.join(DIR, file);
    if (!fs.existsSync(fp)) continue;
    const id = Number(db.prepare('INSERT INTO images(category,title,w,h,featured,sort,created) VALUES (?,?,0,0,?,?,?)').run(category, title, featured, i, Date.now()).lastInsertRowid);
    try {
      const { w, h } = await images.processUpload(id, fs.readFileSync(fp));
      db.prepare('UPDATE images SET w=?,h=? WHERE id=?').run(w, h, id);
    } catch (e) { db.prepare('DELETE FROM images WHERE id=?').run(id); images.removeFiles(id); console.error('seed photo failed:', file, e.message); continue; }
    if (use.hero) set.hero_image = String(id);
    if (use.about) set.about_image = String(id);
    if (use.cta) set.cta_image = String(id);
    if (use.service) db.prepare('UPDATE services SET image_id=? WHERE slug=?').run(id, use.service);
  }
  if (Object.keys(set).length) setSettings(set);
  console.log('Starter photographs loaded (replace them in Admin → Gallery).');
}
module.exports = { seedPhotos };
