#!/usr/bin/env node
// index.js — Main entry point for bulletin parsing pipeline
// Usage:
//   node scripts/bulletin-parser/index.js                    # parse all pilot churches
//   node scripts/bulletin-parser/index.js --church <id>      # parse one church
//   node scripts/bulletin-parser/index.js --review           # review pending items

var config = require('./config');
var fetcher = require('./fetch-bulletin');
var converter = require('./pdf-to-images');
var parser = require('./parse-page');
var store = require('./store-results');
var diff = require('./diff-engine');
var sb = require('@supabase/supabase-js');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// Parse CLI args
var args = process.argv.slice(2);
var mode = 'pilot'; // default
var targetChurch = null;

for (var a = 0; a < args.length; a++) {
  if (args[a] === '--church' && args[a + 1]) {
    mode = 'single';
    targetChurch = args[a + 1];
    a++;
  } else if (args[a] === '--review') {
    mode = 'review';
  }
}

if (mode === 'review') {
  require('./review-cli').run();
} else {
  runPipeline();
}

function runPipeline() {
  var churchIds = mode === 'single' ? [targetChurch] : config.PILOT_CHURCHES;

  console.log('=== MassFinder Bulletin Parser ===');
  console.log('Mode: ' + mode);
  console.log('Churches: ' + churchIds.length);
  console.log('Model: ' + config.PARSE_MODEL);
  console.log('');

  // Fetch church records from Supabase
  supabase.from('churches')
    .select('id, name, city, bulletin_url')
    .in('id', churchIds)
    .then(function(res) {
      if (res.error) {
        console.error('Failed to fetch churches:', res.error.message);
        process.exit(1);
      }

      var churches = res.data || [];
      if (churches.length === 0) {
        console.error('No churches found for IDs:', churchIds.join(', '));
        process.exit(1);
      }

      console.log('Found ' + churches.length + ' churches\n');

      var totalCost = 0;
      var totalItems = 0;
      var results = [];
      var i = 0;

      function processNext() {
        if (i >= churches.length) {
          printSummary(results, totalCost, totalItems);
          return;
        }

        var church = churches[i];
        i++;
        console.log('━━━ [' + i + '/' + churches.length + '] ' + church.name + ' (' + church.city + ') ━━━');

        processChurch(church).then(function(result) {
          results.push(result);
          if (result.cost) totalCost += result.cost;
          if (result.itemCount) totalItems += result.itemCount;
          console.log('');
          processNext();
        }).catch(function(err) {
          console.error('  ERROR: ' + err.message);
          results.push({ church: church, status: 'error', error: err.message });
          console.log('');
          processNext();
        });
      }

      processNext();
    });
}

function processChurch(church) {
  // Step 1: Fetch bulletin
  console.log('  Fetching bulletin...');
  return fetcher.fetchBulletin(church).then(function(fetchResult) {
    if (!fetchResult) {
      console.log('  No bulletin available — skipping');
      return { church: church, status: 'skipped' };
    }

    // Step 2: Get images (PDF conversion or direct images)
    console.log('  Converting to images...');
    var imagesPromise;
    if (fetchResult.pdfBuffer) {
      imagesPromise = converter.pdfToImages(fetchResult.pdfBuffer);
    } else if (fetchResult.images) {
      imagesPromise = converter.downloadImages(fetchResult.images);
    } else {
      return { church: church, status: 'no_content' };
    }

    return imagesPromise.then(function(pages) {
      if (pages.length === 0) {
        console.log('  No pages extracted — skipping');
        return { church: church, status: 'no_pages' };
      }

      console.log('  Got ' + pages.length + ' pages, sending to Claude...');

      // Step 3: Parse with Claude Vision
      return parser.parseAllPages(pages, church.name, church.city, null).then(function(parseResult) {
        console.log('  Extracted ' + parseResult.allItems.length + ' items ($' + parseResult.totalCost.toFixed(4) + ')');

        // Determine bulletin date
        var bulletinDate = fetchResult.bulletinDate || getNextSunday();

        // Step 4: Store in Supabase
        console.log('  Storing in Supabase...');
        return store.storeResults({
          churchId: church.id,
          bulletinDate: bulletinDate,
          sourceUrl: fetchResult.sourceUrl,
          sourceDomain: fetchResult.sourceDomain,
          pageCount: pages.length,
          allItems: parseResult.allItems,
          pageResults: parseResult.pageResults,
          totalCost: parseResult.totalCost,
        }).then(function(storeResult) {
          console.log('  Stored: bulletin #' + storeResult.bulletinId + ', ' + storeResult.itemCount + ' items');

          // Step 5: Diff against previous week
          return diff.markUnchanged(storeResult.bulletinId, church.id).then(function(diffResult) {
            console.log('  Diff: ' + diffResult.new + ' new, ' + diffResult.unchanged + ' unchanged');
            return {
              church: church,
              status: 'success',
              bulletinId: storeResult.bulletinId,
              itemCount: storeResult.itemCount,
              newItems: diffResult.new,
              unchangedItems: diffResult.unchanged,
              cost: parseResult.totalCost,
              pageCount: pages.length,
            };
          });
        });
      });
    });
  });
}

function getNextSunday() {
  var d = new Date();
  var day = d.getDay();
  var diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  var yyyy = d.getFullYear();
  var mm = String(d.getMonth() + 1).padStart(2, '0');
  var dd = String(d.getDate()).padStart(2, '0');
  return yyyy + '-' + mm + '-' + dd;
}

function printSummary(results, totalCost, totalItems) {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('           SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  var success = results.filter(function(r) { return r.status === 'success'; });
  var skipped = results.filter(function(r) { return r.status === 'skipped'; });
  var errors = results.filter(function(r) { return r.status === 'error'; });

  console.log('Parsed:  ' + success.length);
  console.log('Skipped: ' + skipped.length);
  console.log('Errors:  ' + errors.length);
  console.log('Items:   ' + totalItems);
  console.log('Cost:    $' + totalCost.toFixed(4));

  if (success.length > 0) {
    console.log('\nParsed churches:');
    success.forEach(function(r) {
      console.log('  ' + r.church.name + ': ' + r.itemCount + ' items (' + r.newItems + ' new) — $' + r.cost.toFixed(4));
    });
  }

  if (skipped.length > 0) {
    console.log('\nSkipped (need manual PDF):');
    skipped.forEach(function(r) {
      console.log('  ' + r.church.name + ' — drop PDF in bulletins-manual/' + r.church.id + '.pdf');
    });
  }

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(function(r) {
      console.log('  ' + r.church.name + ': ' + r.error);
    });
  }

  console.log('\nRun "node scripts/bulletin-parser/index.js --review" to review pending items.');
}
