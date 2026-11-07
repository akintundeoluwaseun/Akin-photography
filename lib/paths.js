'use strict';
const path = require('node:path');
// Vercel's disk is read-only except /tmp, and /tmp is wiped often. With GITHUB_TOKEN set, the site saves everything back to the repo (see lib/remote.js).
const DATA_DIR = process.env.DATA_DIR || (process.env.VERCEL ? '/tmp/akin-data' : path.join(__dirname, '..', 'data'));
module.exports = { DATA_DIR, DB_FILE: path.join(DATA_DIR, 'akin.db'), UPLOADS: path.join(DATA_DIR, 'uploads') };
