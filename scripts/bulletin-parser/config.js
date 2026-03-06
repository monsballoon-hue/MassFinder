// config.js — Bulletin parser configuration
// Loads environment variables and defines constants

var path = require('path');
var fs = require('fs');

// Load .env.local
var envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  var lines = fs.readFileSync(envPath, 'utf8').split('\n');
  lines.forEach(function(line) {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    var eq = line.indexOf('=');
    if (eq === -1) return;
    var key = line.slice(0, eq);
    var val = line.slice(eq + 1);
    if (!process.env[key]) process.env[key] = val;
  });
}

// Validate required keys
var SUPABASE_URL = process.env.SUPABASE_URL;
var SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
var ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!ANTHROPIC_API_KEY) {
  console.error('Missing ANTHROPIC_API_KEY in .env.local');
  process.exit(1);
}

// 10 pilot churches (Supabase church IDs)
var PILOT_CHURCHES = [
  'st-agnes-church-dalton',                          // parishesonline.com
  'our-lady-of-the-valley-church-easthampton',       // parishesonline.com
  'immaculate-conception-church-indian-orchard',     // parishesonline.com
  'our-lady-of-fatima-church-ludlow',                // church-bulletin.org
  'holy-name-church-springfield',                    // church-bulletin.org
  'blessed-sacrament-church-greenfield',             // blessedtrinitygreenfield.org
  'st-mary-s-church-longmeadow',                     // stmarylong.org
  'st-joseph-church-shelburne-falls',                // stjosephparishma.com
  'our-lady-of-czestochowa-church-turners-falls',   // wordpress.com
  'st-michael-church-brattleboro',                   // stmichaelvt.com
];

// Claude model for vision parsing
var PARSE_MODEL = 'claude-sonnet-4-20250514';
var MAX_TOKENS = 8000;
var MAX_PAGES = 8;
var IMAGE_DPI = 200;
var IMAGE_WIDTH = 1600;
var IMAGE_HEIGHT = 2100;
var CONFIDENCE_AUTO_APPROVE = 0.95;

module.exports = {
  SUPABASE_URL: SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: ANTHROPIC_API_KEY,
  PILOT_CHURCHES: PILOT_CHURCHES,
  PARSE_MODEL: PARSE_MODEL,
  MAX_TOKENS: MAX_TOKENS,
  MAX_PAGES: MAX_PAGES,
  IMAGE_DPI: IMAGE_DPI,
  IMAGE_WIDTH: IMAGE_WIDTH,
  IMAGE_HEIGHT: IMAGE_HEIGHT,
  CONFIDENCE_AUTO_APPROVE: CONFIDENCE_AUTO_APPROVE,
};
