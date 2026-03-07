#!/usr/bin/env node
// classify-sources.js — Classify all parishes by bulletin source type
// Reports which parishes can use v2 text path vs need other handling
// Usage: node scripts/bulletin-parser/classify-sources.js [--fetch]
//   --fetch: actually fetch and test text extraction (costs time, no API $)

var fs = require('fs');
var path = require('path');
var url = require('url');
var loader = require('./load-services');
var extractor = require('./extract-text');
var fetcher = require('./fetch-bulletin');

var parishData = loader.loadParishData();
var churchMapPath = path.resolve(__dirname, '../../parish_to_church_map.json');
var rawMap = JSON.parse(fs.readFileSync(churchMapPath, 'utf8'));

// Reverse map: church_id -> parish_id
var churchToParish = {};
Object.keys(rawMap).forEach(function(pid) {
  churchToParish[rawMap[pid]] = pid;
});

var doFetch = process.argv.indexOf('--fetch') !== -1;

// Classify each parish
var results = [];
parishData.parishes.forEach(function(parish) {
  var bulletinUrl = parish.bulletin_url || '';
  var parsed = bulletinUrl ? url.parse(bulletinUrl) : null;
  var domain = parsed ? (parsed.hostname || '') : '';

  // Determine source category
  var category;
  if (!bulletinUrl) {
    category = 'no_url';
  } else if (domain === 'parishesonline.com') {
    category = 'lpi';
  } else if (domain === 'church-bulletin.org') {
    category = 'church_bulletin_org';
  } else if (domain.indexOf('wordpress.com') !== -1) {
    category = 'wordpress';
  } else if (domain === 'sponsors.bonventure.net' || domain === 'www.pilotbulletins.net') {
    category = 'bulletin_service';
  } else {
    category = 'self_hosted';
  }

  // Find churches in this parish
  var churches = (parish.locations || []).filter(function(loc) {
    return loc.type === 'church';
  });

  // Count services
  var serviceCount = (parish.services || []).length;

  // Check for manual PDF
  var manualPdfs = churches.map(function(ch) {
    var manualPath = path.resolve(__dirname, '../../bulletins-manual', ch.id + '.pdf');
    return fs.existsSync(manualPath) ? ch.id : null;
  }).filter(Boolean);

  results.push({
    parishId: parish.id,
    parishName: parish.name,
    category: category,
    domain: domain,
    bulletinUrl: bulletinUrl,
    churches: churches.map(function(c) { return c.id; }),
    churchCount: churches.length,
    serviceCount: serviceCount,
    manualPdfs: manualPdfs,
    hasManual: manualPdfs.length > 0,
  });
});

// Summary by category
var categories = {};
results.forEach(function(r) {
  if (!categories[r.category]) {
    categories[r.category] = { count: 0, services: 0, churches: 0, withManual: 0 };
  }
  categories[r.category].count++;
  categories[r.category].services += r.serviceCount;
  categories[r.category].churches += r.churchCount;
  if (r.hasManual) categories[r.category].withManual++;
});

console.log('=== Parish Bulletin Source Classification ===');
console.log('Total parishes: ' + results.length);
console.log('');

console.log('Category            Parishes  Churches  Services  Manual PDFs');
console.log('──────────────────────────────────────────────────────────────');

var catOrder = ['lpi', 'church_bulletin_org', 'self_hosted', 'bulletin_service', 'wordpress', 'no_url'];
catOrder.forEach(function(cat) {
  var c = categories[cat];
  if (!c) return;
  var label = cat;
  while (label.length < 20) label += ' ';
  console.log(label +
    padLeft(String(c.count), 8) + '  ' +
    padLeft(String(c.churches), 8) + '  ' +
    padLeft(String(c.services), 8) + '  ' +
    padLeft(String(c.withManual), 11));
});

console.log('');

// V2 eligibility assessment
var textEligible = results.filter(function(r) {
  return r.category === 'lpi' || r.category === 'church_bulletin_org' || r.category === 'self_hosted' || r.category === 'bulletin_service';
});
var autoFetchable = results.filter(function(r) {
  return r.category === 'church_bulletin_org';
});

console.log('V2 Text Path Eligible: ' + textEligible.length + '/' + results.length + ' parishes');
console.log('  Auto-fetchable (church-bulletin.org): ' + autoFetchable.length);
console.log('  LPi (need fetcher): ' + categories.lpi.count);
console.log('  Self-hosted (need manual or fetcher): ' + (categories.self_hosted ? categories.self_hosted.count : 0));
console.log('  Not eligible: ' + ((categories.wordpress ? categories.wordpress.count : 0) + (categories.no_url ? categories.no_url.count : 0)));
console.log('');

// If --fetch, test church-bulletin.org fetching + text extraction
if (doFetch) {
  console.log('=== Fetch & Text Extraction Test ===');
  console.log('Testing church-bulletin.org parishes...');
  console.log('');

  var cbParishes = results.filter(function(r) { return r.category === 'church_bulletin_org'; });
  var fetchIdx = 0;

  function fetchNext() {
    if (fetchIdx >= cbParishes.length) {
      console.log('\nDone.');
      return;
    }
    var r = cbParishes[fetchIdx];
    fetchIdx++;

    var churchId = r.churches[0]; // primary church
    if (!churchId) {
      console.log('  ' + r.parishName + ': no churches');
      fetchNext();
      return;
    }

    var churchInfo = {
      id: churchId,
      name: r.parishName,
      city: '',
      bulletin_url: r.bulletinUrl,
    };

    console.log('[' + fetchIdx + '/' + cbParishes.length + '] ' + r.parishName);
    fetcher.fetchBulletin(churchInfo).then(function(fetchResult) {
      if (!fetchResult || !fetchResult.pdfBuffer) {
        console.log('  -> No PDF available');
        fetchNext();
        return;
      }

      var textResult = extractor.extractText(fetchResult.pdfBuffer);
      var totalChars = textResult.pages.reduce(function(s, p) { return s + p.charCount; }, 0);
      console.log('  -> quality: ' + textResult.quality + ', pages: ' + textResult.pages.length + ', chars: ' + totalChars);
      fetchNext();
    }).catch(function(err) {
      console.log('  -> ERROR: ' + err.message);
      fetchNext();
    });
  }

  fetchNext();
} else {
  // List church-bulletin.org parishes
  console.log('church-bulletin.org parishes (auto-fetchable):');
  results.filter(function(r) { return r.category === 'church_bulletin_org'; }).forEach(function(r) {
    console.log('  ' + r.parishId + ' — ' + r.parishName + ' (' + r.serviceCount + ' services)');
  });

  console.log('');
  console.log('Parishes with manual PDFs already:');
  results.filter(function(r) { return r.hasManual; }).forEach(function(r) {
    console.log('  ' + r.parishId + ' — ' + r.parishName + ' [' + r.manualPdfs.join(', ') + ']');
  });

  console.log('');
  console.log('Run with --fetch to test church-bulletin.org text extraction.');
}

function padLeft(str, len) {
  while (str.length < len) str = ' ' + str;
  return str;
}
