#!/usr/bin/env node
/**
 * prep-review.js
 *
 * Picks the top 3 parishes for today's review session and writes a
 * ready-to-paste prompt for Claude.ai.
 *
 * Usage:
 *   node scripts/prep-review.js
 *   node scripts/prep-review.js --count 5   (review more parishes)
 *   node scripts/prep-review.js --flag parish_042  (force a parish to the top)
 *   node scripts/prep-review.js --dry-run   (show scores, don't write files)
 *
 * Output:
 *   review/today-prompt.txt  — paste this into Claude.ai
 *   review/queue.json        — updated with today's selections
 */

const fs   = require('fs');
const path = require('path');

const ROOT       = path.join(__dirname, '..');
const DATA_FILE  = path.join(ROOT, 'parish_data.json');
const QUEUE_FILE = path.join(ROOT, 'review', 'queue.json');
const LOG_FILE   = path.join(ROOT, 'review', 'change_log.json');
const OUT_FILE   = path.join(ROOT, 'review', 'today-prompt.txt');

// ── CLI args ──────────────────────────────────────────────────────────────
const args       = process.argv.slice(2);
const COUNT      = parseInt(args[args.indexOf('--count') + 1] || '3', 10);
const DRY_RUN    = args.includes('--dry-run');
const FLAG_ID    = args.includes('--flag') ? args[args.indexOf('--flag') + 1] : null;
const SKIP_DAYS  = 3; // don't re-review a parish within this many days

// ── Load data ─────────────────────────────────────────────────────────────
const data     = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
const queue    = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf8'));
const changeLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));

const today     = new Date();
const todayStr  = today.toISOString().slice(0, 10);

// ── Easter calculation (Anonymous Gregorian algorithm) ────────────────────
function computeEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 1-based
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

// ── Liturgical season multiplier ──────────────────────────────────────────
//
// Returns a weight (0.6 – 2.0) that boosts or suppresses review urgency
// based on proximity to schedule-changing liturgical transitions.
//
function getSeasonalMultiplier(date) {
  const year   = date.getUTCFullYear();
  const easter = computeEaster(year);
  const dayMs  = 86400000;

  function addDays(d, n) { return new Date(d.getTime() + n * dayMs); }
  function between(d, start, end) { return d >= start && d <= end; }

  const ashWed    = addDays(easter, -46);
  const palmSun   = addDays(easter, -7);
  const easterEnd = addDays(easter, 14);

  // Fixed approximate dates
  const summerSurgeStart = new Date(Date.UTC(year, 4, 15));  // May 15
  const summerSurgeEnd   = new Date(Date.UTC(year, 5, 15));  // Jun 15
  const fallSurgeStart   = new Date(Date.UTC(year, 7, 15));  // Aug 15
  const fallSurgeEnd     = new Date(Date.UTC(year, 8, 7));   // Sep 7
  const adventSurge      = new Date(Date.UTC(year, 10, 8));  // Nov 8
  const adventStart      = new Date(Date.UTC(year, 10, 29)); // Nov 29
  const christmasSurge   = new Date(Date.UTC(year, 11, 1));  // Dec 1
  const christmasEnd     = new Date(Date.UTC(year, 11, 26)); // Dec 26

  // Post-season cooldown: just after a big transition (schedule already verified)
  if (between(date, easter, easterEnd))                        return 0.6; // just verified for Easter
  if (between(date, new Date(Date.UTC(year, 5, 15)), new Date(Date.UTC(year, 6, 15)))) return 0.6;
  if (between(date, new Date(Date.UTC(year, 8, 7)),  new Date(Date.UTC(year, 9, 1))))  return 0.6;
  if (between(date, christmasEnd, new Date(Date.UTC(year+1, 0, 10))))                  return 0.6;

  // High urgency: imminent schedule changes
  if (between(date, palmSun, easter))                          return 2.0; // Holy Week
  if (between(date, christmasSurge, christmasEnd))             return 2.0; // Christmas
  if (between(date, addDays(ashWed, -21), ashWed))             return 1.8; // pre-Lent
  if (between(date, addDays(palmSun, -14), palmSun))           return 1.8; // pre-Holy Week

  // Medium urgency: seasonal transitions approaching
  if (between(date, summerSurgeStart, summerSurgeEnd))         return 1.5; // pre-summer
  if (between(date, fallSurgeStart, fallSurgeEnd))             return 1.5; // fall return
  if (between(date, adventSurge, adventStart))                 return 1.5; // pre-Advent
  if (between(date, ashWed, palmSun))                          return 1.3; // Lent (schedules active)

  return 1.0; // Ordinary Time
}

// ── Date helpers ──────────────────────────────────────────────────────────
function parseDate(s) {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function latestSourceDate(services) {
  let latest = null;
  for (const s of services || []) {
    if (!s.source) continue;
    const m = s.source.match(/(\d{4}-\d{2}(?:-\d{2})?)/);
    if (!m) continue;
    const raw = m[1].length === 7 ? m[1] + '-01' : m[1];
    const d = new Date(raw + 'T00:00:00Z');
    if (!isNaN(d.getTime()) && (!latest || d > latest)) latest = d;
  }
  return latest;
}

// ── Priority score ────────────────────────────────────────────────────────
//
// score = staleness(0-100) * seasonalMultiplier + bonuses
//
function score(parish, queue, today, multiplier) {
  // Staleness: prefer validation.last_checked, fall back to service source dates
  const checked  = parseDate(parish.validation && parish.validation.last_checked);
  const sourced  = latestSourceDate(parish.services);
  const lastDate = checked || sourced;

  let staleness;
  if (!lastDate) {
    staleness = 100; // unknown = treat as most stale
  } else {
    const days = daysBetween(lastDate, today);
    staleness = Math.min(days, 60) / 60 * 100;
  }

  const hasBulletin = !!(parish.bulletin_url || (parish.contact && parish.contact.website));
  const isFlagged   = !!(queue.flags && queue.flags[parish.id]);

  return (staleness * multiplier)
    + (hasBulletin ? 15 : 0)
    + (isFlagged   ? 50 : 0);
}

// ── Build priority list ───────────────────────────────────────────────────
const multiplier = getSeasonalMultiplier(today);
const todayUTC   = new Date(todayStr + 'T00:00:00Z');

const scored = (data.parishes || [])
  .filter(p => p.status === 'active')
  .map(p => {
    const lastRun   = parseDate(queue.history && queue.history[p.id]);
    const daysSince = lastRun ? daysBetween(lastRun, todayUTC) : 999;
    const sc        = score(p, queue, todayUTC, multiplier);
    return { parish: p, score: sc, daysSince };
  })
  .filter(r => r.daysSince >= SKIP_DAYS) // don't re-review too soon
  .sort((a, b) => b.score - a.score);

// Apply manual flag override
if (FLAG_ID) {
  const flagIdx = scored.findIndex(r => r.parish.id === FLAG_ID);
  if (flagIdx > 0) {
    const [item] = scored.splice(flagIdx, 1);
    scored.unshift(item);
    console.log('Flagged parish moved to top:', FLAG_ID);
  } else if (flagIdx === -1) {
    console.warn('Warning: --flag parish ID not found or already in top position:', FLAG_ID);
  }
}

const selected = scored.slice(0, COUNT);

// ── Dry run: just print scores ────────────────────────────────────────────
if (DRY_RUN) {
  const seasonLabel = getSeasonLabel(today);
  console.log('\n══════════════════════════════════════════════════');
  console.log('  MassFinder Priority Queue — DRY RUN');
  console.log('  Date: ' + todayStr + '  Season: ' + seasonLabel);
  console.log('  Seasonal multiplier: ' + multiplier.toFixed(2) + 'x');
  console.log('══════════════════════════════════════════════════\n');
  console.log('  Rank  Score  Days since review  Parish');
  console.log('  ────  ─────  ─────────────────  ──────────────────────────────────');
  scored.slice(0, 20).forEach((r, i) => {
    const flag = selected.includes(r) ? '→' : ' ';
    console.log(
      '  ' + flag + ' ' + String(i+1).padStart(3) + '  ' +
      String(Math.round(r.score)).padStart(5) + '  ' +
      String(r.daysSince === 999 ? 'never' : r.daysSince + 'd').padStart(17) + '  ' +
      r.parish.name + ' (' + r.parish.id + ')'
    );
  });
  process.exit(0);
}

// ── Format service list for prompt ───────────────────────────────────────
function formatServices(services) {
  if (!services || !services.length) return '  (no services on file)';
  const lines = [];
  for (const s of services) {
    if (!s.day || !s.time) continue;
    const type = s.type.replace(/_/g, ' ');
    const day  = s.day;
    const time = s.time;
    const lang = s.language !== 'en' ? ' [' + s.language + ']' : '';
    const note = s.notes ? ' — ' + s.notes : '';
    const seas = (s.seasonal && s.seasonal.is_seasonal) ? ' (' + s.seasonal.season + ' only)' : '';
    lines.push('  ' + type + ' · ' + day + ' ' + time + lang + seas + note);
  }
  return lines.length ? lines.join('\n') : '  (no timed services on file)';
}

function getSeasonLabel(date) {
  const m = getSeasonalMultiplier(date);
  if (m >= 2.0) return 'HIGH URGENCY (Holy Week / Christmas)';
  if (m >= 1.8) return 'PRE-SEASON SURGE';
  if (m >= 1.5) return 'SEASONAL TRANSITION';
  if (m >= 1.3) return 'LENT';
  if (m <= 0.7) return 'POST-SEASON (recently verified)';
  return 'Ordinary Time';
}

// ── Build corrections context ─────────────────────────────────────────────
function formatCorrections() {
  const entries = (changeLog.corrections || []).slice(-20); // last 20
  if (!entries.length) return '(No corrections logged yet.)';
  return entries.map(c =>
    '• [' + c.error_type + '] ' + c.parish_name + ' (' + c.date + '): ' + c.description
  ).join('\n');
}

// ── Write the Claude prompt ───────────────────────────────────────────────
const seasonLabel = getSeasonLabel(today);

let prompt = `=================================================================
MASSFINDER — DAILY PARISH REVIEW
Date: ${todayStr}
Parishes to review: ${selected.length}
Liturgical season: ${seasonLabel} (multiplier: ${multiplier.toFixed(2)}x)
=================================================================

TASK
----
For each parish below, please check the current schedule from the
source URL provided and compare it to the stored data.

Return a JSON block for each parish in this exact format:

{
  "parish_id": "parish_XXX",
  "changes_found": true | false,
  "proposed_services": [ ... ],   // full services array if changes found
  "notes": "any relevant notes",
  "source_checked": "the URL you verified"
}

If no changes are found, set changes_found: false and omit
proposed_services.

SERVICE TYPE VALUES (use exactly as shown):
sunday_mass, daily_mass, confession, adoration, perpetual_adoration,
holy_hour, communion_service, rosary, stations_of_cross, divine_mercy,
miraculous_medal, novena, devotion, vespers, anointing_of_sick,
benediction, holy_thursday_mass, good_friday_service, easter_vigil_mass,
bible_study, gorzkie_zale, mens_group, social_event

DAY VALUES: sunday, monday, tuesday, wednesday, thursday, friday,
saturday, daily, weekday, first_friday, first_saturday, first_sunday,
first_thursday, holyday, lent, good_friday, holy_thursday, easter_vigil

TIME FORMAT: 24-hour HH:MM (e.g. 09:00, 17:30, 19:00)

LANGUAGE VALUES: en, es, la, pl, pt, fr, vi, asl

KNOWN PARSING CORRECTIONS (apply these rules):
----------------------------------------------------------------
${formatCorrections()}
----------------------------------------------------------------

`;

selected.forEach((r, idx) => {
  const p    = r.parish;
  const loc  = (p.locations || [])[0] || {};
  const site = p.bulletin_url || (p.contact && p.contact.website) || '(no URL on file — manual verification needed)';

  prompt += `
═══════════════════════════════════════════════════════════════
PARISH ${idx + 1} of ${selected.length}
═══════════════════════════════════════════════════════════════
Name:      ${p.name}
ID:        ${p.id}
Town:      ${p.town}, ${p.state}
Address:   ${loc.address || '(no address on file)'}

SOURCE TO CHECK:
  ${site}

CURRENTLY STORED SERVICES:
${formatServices(p.services)}

VALIDATION STATUS: ${(p.validation && p.validation.status) || 'unknown'}
Last checked: ${(p.validation && p.validation.last_checked) || 'unknown'}

`;
});

prompt += `
=================================================================
HOW TO RESPOND

1. For each parish, visit the source URL above.
2. Return one JSON object per parish (3 total).
3. If a parish has no URL listed, note it in "notes" and set
   changes_found: false — I'll verify manually.
4. Flag any seasonal-only services (Lent, summer, etc.) by
   setting seasonal: { is_seasonal: true, season: "lent" }
   on the service object.

After I review your output, I'll update parish_data.json and
log any corrections you got wrong to the corrections file.
=================================================================
`;

// ── Write output ──────────────────────────────────────────────────────────
fs.writeFileSync(OUT_FILE, prompt, 'utf8');

// Update queue history
if (!queue.history) queue.history = {};
selected.forEach(r => { queue.history[r.parish.id] = todayStr; });
queue.last_run = todayStr;
fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2));

// ── Console summary ───────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  MassFinder Daily Review — ' + todayStr);
console.log('  Season: ' + seasonLabel);
console.log('══════════════════════════════════════════════════════════════\n');
console.log('  Today\'s parishes:\n');
selected.forEach((r, i) => {
  const p   = r.parish;
  const url = p.bulletin_url || (p.contact && p.contact.website) || '(no URL)';
  console.log('  ' + (i+1) + '. ' + p.name);
  console.log('     ' + p.town + ', ' + p.state + ' · ' + p.id);
  console.log('     Score: ' + Math.round(r.score) + '  ·  Last reviewed: ' +
    (r.daysSince === 999 ? 'never' : r.daysSince + ' days ago'));
  console.log('     Source: ' + url);
  console.log('');
});
console.log('  Prompt written to:  review/today-prompt.txt');
console.log('  Queue updated:      review/queue.json\n');
console.log('  Next steps:');
console.log('  1. Open the source URLs above in your browser');
console.log('  2. Open claude.ai → your MassFinder project (or new chat)');
console.log('  3. Paste review/today-prompt.txt');
console.log('  4. Add any bulletin text or screenshots if needed');
console.log('  5. Paste Claude\'s JSON response into admin.html → Proposed Changes');
console.log('  6. Review, approve changes, Download JSON, commit\n');
