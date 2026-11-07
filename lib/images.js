'use strict';
const sharp = require('sharp');
const fs = require('node:fs');
const path = require('node:path');
const { DATA_DIR } = require('./db');

const DIR = path.join(DATA_DIR, 'uploads');
const WIDTHS = [480, 960, 1600];

/* every upload becomes three web-sized WebP files plus a 1200x630 JPEG for social previews */
async function processUpload(id, buffer) {
  const img = sharp(buffer, { failOn: 'error' }).rotate();
  const meta = await img.metadata();
  if (!['jpeg', 'png', 'webp'].includes(meta.format)) throw new Error('Please upload a JPG, PNG or WebP photograph.');
  const base = await img.clone().rotate().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = base.info;
  for (const width of WIDTHS) {
    if (width > w && width !== WIDTHS[0]) continue;
    await sharp(base.data).resize({ width: Math.min(width, w), withoutEnlargement: true }).webp({ quality: 78 }).toFile(path.join(DIR, `${id}-${width}.webp`));
  }
  await sharp(base.data).resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 80, progressive: true }).toFile(path.join(DIR, `${id}-og.jpg`));
  return { w, h };
}
function removeFiles(id) {
  for (const f of fs.readdirSync(DIR)) if (f.startsWith(id + '-')) fs.rmSync(path.join(DIR, f), { force: true });
}
function available(id) {
  return WIDTHS.filter((w) => fs.existsSync(path.join(DIR, `${id}-${w}.webp`)));
}
module.exports = { processUpload, removeFiles, available, DIR, WIDTHS };
