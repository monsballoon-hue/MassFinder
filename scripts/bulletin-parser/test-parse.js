#!/usr/bin/env node
// test-parse.js — Dry-run a bulletin PDF through the extraction prompt
// Usage: node scripts/bulletin-parser/test-parse.js [church-id]
// Defaults to st-mary-s-church-longmeadow

var fs = require('fs');
var path = require('path');
var converter = require('./pdf-to-images');
var parser = require('./parse-page');

var churchId = process.argv[2] || 'st-mary-s-church-longmeadow';
var pdfPath = path.resolve(__dirname, '../../bulletins-manual', churchId + '.pdf');

if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found: ' + pdfPath);
  process.exit(1);
}

// Map church IDs to display names (just for the prompt context)
var CHURCH_NAMES = {
  'st-mary-s-church-longmeadow': { name: "St. Mary's Church", town: 'Longmeadow' },
  'blessed-sacrament-church-greenfield': { name: 'Blessed Sacrament Church', town: 'Greenfield' },
  'immaculate-conception-church-indian-orchard': { name: 'Immaculate Conception Church', town: 'Indian Orchard' },
  'our-lady-of-the-valley-church-easthampton': { name: 'Our Lady of the Valley Church', town: 'Easthampton' },
  'st-agnes-church-dalton': { name: 'St. Agnes Church', town: 'Dalton' },
  'st-joseph-church-shelburne-falls': { name: 'St. Joseph Church', town: 'Shelburne Falls' },
  'st-michael-church-brattleboro': { name: 'St. Michael Church', town: 'Brattleboro' },
};

var info = CHURCH_NAMES[churchId] || { name: churchId, town: '' };

// Load parish profile if available
var profilesPath = path.resolve(__dirname, 'parish-profiles.json');
var allProfiles = {};
if (fs.existsSync(profilesPath)) {
  allProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
}
var profile = allProfiles[churchId] || null;

console.log('=== Bulletin Extraction Test ===');
console.log('Church: ' + info.name + ' (' + info.town + ')');
console.log('PDF:    ' + pdfPath);
if (profile) console.log('Profile: loaded (' + (profile.skip_pages.length ? 'skip pages: ' + profile.skip_pages.join(', ') : 'no skip pages') + ')');
console.log('');

var pdfBuffer = fs.readFileSync(pdfPath);

converter.pdfToImages(pdfBuffer).then(function(pages) {
  console.log('Got ' + pages.length + ' pages\n');

  // Filter out skip_pages from profile
  if (profile && profile.skip_pages && profile.skip_pages.length) {
    var skipSet = {};
    profile.skip_pages.forEach(function(p) { skipSet[p] = true; });
    var beforeCount = pages.length;
    pages = pages.filter(function(p) { return !skipSet[p.page]; });
    if (pages.length < beforeCount) {
      console.log('Skipped ' + (beforeCount - pages.length) + ' page(s) per profile: ' + profile.skip_pages.join(', ') + '\n');
    }
  }

  return parser.parseAllPages(pages, info.name, info.town, profile);
}).then(function(result) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('         RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Total items: ' + result.allItems.length);
  console.log('Total cost:  $' + result.totalCost.toFixed(4));

  if (result.clergy.length > 0) {
    console.log('\nClergy:');
    result.clergy.forEach(function(c) {
      console.log('  ' + c.role + ': ' + c.name);
    });
  }

  if (result.massSchedule.length > 0) {
    console.log('\nMass Schedule:');
    result.massSchedule.forEach(function(m) {
      console.log('  ' + m.day + ' ' + m.time + (m.notes ? ' (' + m.notes + ')' : ''));
    });
  }

  // Group by type
  var services = result.allItems.filter(function(i) { return i.item_type === 'service'; });
  var events = result.allItems.filter(function(i) { return i.item_type === 'event'; });
  var notices = result.allItems.filter(function(i) { return i.item_type === 'notice'; });

  if (services.length > 0) {
    console.log('\n── SERVICES (' + services.length + ') ──');
    services.forEach(function(item) {
      printItem(item);
    });
  }

  if (events.length > 0) {
    console.log('\n── EVENTS (' + events.length + ') ──');
    events.forEach(function(item) {
      printItem(item);
    });
  }

  if (notices.length > 0) {
    console.log('\n── NOTICES (' + notices.length + ') ──');
    notices.forEach(function(item) {
      printItem(item);
    });
  }

  // Per-page summary
  console.log('\n── PAGE SUMMARY ──');
  result.pageResults.forEach(function(pr, idx) {
    console.log('  Page ' + (idx + 1) + ': ' + pr.page_type +
      ' (' + pr.items.length + ' items, $' + pr.cost.toFixed(4) + ')' +
      (pr.notes ? ' — ' + pr.notes : ''));
  });

  // Write full JSON for inspection
  var outPath = path.resolve(__dirname, '../../.tmp-test-output.json');
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log('\nFull JSON written to: ' + outPath);

}).catch(function(err) {
  console.error('ERROR:', err.message);
  process.exit(1);
});

function printItem(item) {
  var line = '  [' + item.category + ']';
  if (item.seasonal) line += ' {' + item.seasonal + '}';
  line += ' ' + item.title;
  if (item.event_date) line += ' | ' + item.event_date;
  if (item.event_time) line += ' ' + item.event_time;
  if (item.location) line += ' @ ' + item.location;
  if (item.recurring) line += ' (' + item.recurring + ')';
  if (item.host_parish) line += ' [hosted by: ' + item.host_parish + ']';
  line += ' (conf: ' + item.confidence + ')';
  console.log(line);
  if (item.original_text) {
    var preview = item.original_text.replace(/\n/g, ' ').substring(0, 120);
    if (item.original_text.length > 120) preview += '...';
    console.log('    → ' + preview);
  }
}
