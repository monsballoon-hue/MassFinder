#!/usr/bin/env node
/**
 * freshness-check.js
 * Scans parish_data.json and flags parishes whose schedule data
 * has not been updated in more than STALE_MONTHS months.
 *
 * Exit code: always 0 (warnings only — never blocks the build).
 * Output: freshness-report.json written to repo root.
 */

const fs = require('fs');
const path = require('path');

const STALE_MONTHS = 6;
const DATA_FILE = path.join(__dirname, '../../parish_data.json');
const REPORT_FILE = path.join(__dirname, '../../freshness-report.json');

// ── Helpers ────────────────────────────────────────────────────────────────

/** Parse a source string into a JS Date, or return null. */
function parseSourceDate(source) {
  if (!source || typeof source !== 'string') return null;

  // "bulletin_2026-02" → 2026-02-01
  // "bulletin_2026-02-28" → 2026-02-28
  // "manual_verification_2026-02-21" → 2026-02-21
  const match = source.match(/(\d{4}-\d{2}(?:-\d{2})?)/);
  if (!match) return null;

  const raw = match[1];
  // Pad to full date if only YYYY-MM
  const full = raw.length === 7 ? raw + '-01' : raw;
  const d = new Date(full + 'T00:00:00Z');
  return isNaN(d.getTime()) ? null : d;
}

/** Return the most recent Date from an array of services. */
function latestServiceDate(services) {
  if (!Array.isArray(services)) return null;
  let latest = null;
  for (const svc of services) {
    const d = parseSourceDate(svc.source);
    if (d && (!latest || d > latest)) latest = d;
  }
  return latest;
}

/** Return a Date STALE_MONTHS ago from today (UTC). */
function staleThreshold() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - STALE_MONTHS);
  return d;
}

function monthsAgo(date) {
  const now = new Date();
  const diff =
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth());
  return diff;
}

// ── Main ───────────────────────────────────────────────────────────────────

let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
} catch (e) {
  console.error('freshness-check: could not read parish_data.json:', e.message);
  process.exit(0); // Don't block — schema step already caught parse errors
}

const threshold = staleThreshold();
const stale = [];
const fresh = [];
const noDate = [];

for (const parish of data.parishes || []) {
  // Prefer parish-level validation.last_checked
  let lastDate = null;
  const lastChecked = parish.validation && parish.validation.last_checked;
  if (lastChecked) {
    const d = new Date(lastChecked + 'T00:00:00Z');
    if (!isNaN(d.getTime())) lastDate = d;
  }

  // Fall back to most recent service source date
  if (!lastDate) {
    lastDate = latestServiceDate(parish.services);
  }

  const entry = {
    id: parish.id,
    name: parish.name,
    town: parish.town,
    state: parish.state,
  };

  if (!lastDate) {
    noDate.push({ ...entry, note: 'No date info found in validation or service sources' });
  } else if (lastDate < threshold) {
    stale.push({
      ...entry,
      last_updated: lastDate.toISOString().slice(0, 10),
      months_ago: monthsAgo(lastDate),
    });
  } else {
    fresh.push({
      ...entry,
      last_updated: lastDate.toISOString().slice(0, 10),
    });
  }
}

// Sort stale list: most outdated first
stale.sort((a, b) => a.months_ago - b.months_ago);

const report = {
  generated_at: new Date().toISOString(),
  stale_threshold_months: STALE_MONTHS,
  summary: {
    total: (data.parishes || []).length,
    fresh: fresh.length,
    stale: stale.length,
    no_date_info: noDate.length,
  },
  stale_parishes: stale,
  no_date_info: noDate,
};

// Write JSON report (uploaded as CI artifact)
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

// ── Console output ─────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════');
console.log('  MassFinder Freshness Check');
console.log(`  Threshold: >${STALE_MONTHS} months since last update`);
console.log('══════════════════════════════════════════');
console.log(`  Total parishes : ${report.summary.total}`);
console.log(`  Fresh          : ${report.summary.fresh}`);
console.log(`  Stale          : ${report.summary.stale}`);
console.log(`  No date info   : ${report.summary.no_date_info}`);
console.log('══════════════════════════════════════════\n');

if (stale.length > 0) {
  console.log(`⚠️  ${stale.length} parish(es) with schedules older than ${STALE_MONTHS} months:\n`);
  for (const p of stale) {
    console.log(`  • ${p.name} (${p.town}, ${p.state})`);
    console.log(`    Last updated: ${p.last_updated}  (${p.months_ago} months ago)`);
    console.log(`    Parish ID: ${p.id}\n`);
  }
}

if (noDate.length > 0) {
  console.log(`ℹ️  ${noDate.length} parish(es) with no date information:\n`);
  for (const p of noDate) {
    console.log(`  • ${p.name} (${p.town}, ${p.state}) — ${p.id}`);
  }
  console.log('');
}

if (stale.length === 0 && noDate.length === 0) {
  console.log('✓ All parishes are up to date.\n');
}

console.log(`Full report written to: freshness-report.json\n`);

// Always exit 0 — this is informational only
process.exit(0);
