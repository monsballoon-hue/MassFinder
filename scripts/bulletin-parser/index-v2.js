#!/usr/bin/env node
// index-v2.js — V2 batch orchestrator for text-first change-detection pipeline
// Usage:
//   node scripts/bulletin-parser/index-v2.js                    # all pilot churches
//   node scripts/bulletin-parser/index-v2.js --church <id>      # single church
//   node scripts/bulletin-parser/index-v2.js --dry-run           # print prompts only
//   node scripts/bulletin-parser/index-v2.js --store             # store results in Supabase

var fs = require('fs');
var path = require('path');
var Anthropic = require('@anthropic-ai/sdk');
var config = require('./config');
var fetcher = require('./fetch-bulletin');
var extractor = require('./extract-text');
var loader = require('./load-services');
var promptV2 = require('./prompt-v2');
var storeV2 = require('./store-results-v2');

// Load parish profiles
var profilesPath = path.resolve(__dirname, 'parish-profiles.json');
var allProfiles = {};
try {
  allProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
} catch (e) { /* no profiles */ }

// Load parish data for bulletin_url lookup
var parishData = loader.loadParishData();
var churchMapPath = path.resolve(__dirname, '../../parish_to_church_map.json');
var churchMap = {};
try {
  var rawMap = JSON.parse(fs.readFileSync(churchMapPath, 'utf8'));
  // rawMap is parish_id -> church_id, we need both directions
  Object.keys(rawMap).forEach(function(parishId) {
    churchMap[rawMap[parishId]] = parishId;
  });
} catch (e) {
  console.error('ERROR: Could not load parish_to_church_map.json');
  process.exit(1);
}

// Parse CLI args
var args = process.argv.slice(2);
var mode = 'pilot';
var targetChurch = null;
var dryRun = false;
var doStore = false;

for (var a = 0; a < args.length; a++) {
  if (args[a] === '--church' && args[a + 1]) {
    mode = 'single';
    targetChurch = args[a + 1];
    a++;
  } else if (args[a] === '--dry-run') {
    dryRun = true;
  } else if (args[a] === '--store') {
    doStore = true;
  }
}

// Build church list
var churchIds = mode === 'single' ? [targetChurch] : config.PILOT_CHURCHES;

console.log('=== MassFinder V2 Bulletin Pipeline ===');
console.log('Mode: ' + mode + (dryRun ? ' (DRY RUN)' : '') + (doStore ? ' (STORE)' : ''));
console.log('Churches: ' + churchIds.length);
console.log('Model: ' + config.PARSE_MODEL);
console.log('');

var client = dryRun ? null : new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

// Sequential processing
var results = [];
var totalCost = 0;
var idx = 0;

function processNext() {
  if (idx >= churchIds.length) {
    printSummary();
    return;
  }

  var churchId = churchIds[idx];
  idx++;
  console.log('━━━ [' + idx + '/' + churchIds.length + '] ' + churchId + ' ━━━');

  processChurch(churchId).then(function(result) {
    results.push(result);
    if (result.cost) totalCost += result.cost;
    console.log('');
    processNext();
  }).catch(function(err) {
    console.error('  ERROR: ' + err.message);
    results.push({ churchId: churchId, status: 'error', error: err.message });
    console.log('');
    processNext();
  });
}

processNext();

function processChurch(churchId) {
  // Step 1: Load known services
  var ctx = loader.getChurchContext(churchId);
  if (!ctx) {
    console.log('  [SKIP] Church not found in parish_data.json');
    return Promise.resolve({ churchId: churchId, status: 'not_found' });
  }

  if (ctx.services.length === 0) {
    console.log('  [SKIP] No services on file for ' + ctx.locationName);
    return Promise.resolve({ churchId: churchId, status: 'no_services' });
  }

  console.log('  ' + ctx.parishName + ' (' + ctx.locationName + ') — ' + ctx.services.length + ' services');

  // Step 2: Get parish info for bulletin fetching
  var parishId = churchMap[churchId];
  var parish = null;
  for (var i = 0; i < parishData.parishes.length; i++) {
    if (parishData.parishes[i].id === parishId) {
      parish = parishData.parishes[i];
      break;
    }
  }

  var churchInfo = {
    id: churchId,
    name: ctx.locationName,
    city: ctx.locationCity || '',
    bulletin_url: parish ? parish.bulletin_url : null,
  };

  // Step 3: Fetch bulletin
  console.log('  Fetching bulletin...');
  return fetcher.fetchBulletin(churchInfo).then(function(fetchResult) {
    if (!fetchResult) {
      return { churchId: churchId, status: 'no_bulletin', parish: ctx.parishName };
    }

    if (!fetchResult.pdfBuffer) {
      console.log('  [SKIP] No PDF buffer (images-only source)');
      return { churchId: churchId, status: 'images_only', parish: ctx.parishName };
    }

    // Step 4: Extract text
    console.log('  Extracting text...');
    var textResult = extractor.extractText(fetchResult.pdfBuffer);
    console.log('  Text: ' + textResult.quality + ', ' + textResult.pages.length + ' pages');

    if (textResult.method === 'vision_needed') {
      console.log('  [SKIP] Text extraction failed — needs Vision fallback');
      return { churchId: churchId, status: 'vision_needed', parish: ctx.parishName };
    }

    // Step 5: Build profile — auto-classify, then overlay manual overrides
    var autoClass = loader.getChurchClassification(churchId);
    var manualProfile = allProfiles[churchId] || {};
    var profile = {};
    Object.keys(manualProfile).forEach(function(k) { profile[k] = manualProfile[k]; });
    if (autoClass && autoClass.isMultiChurch && !profile.target_location) {
      profile.target_location = autoClass.target_location;
      profile.sibling_locations = autoClass.sibling_locations;
    }
    if (profile.target_location) {
      console.log('  Multi-church: target=' + profile.target_location +
        (manualProfile.target_location ? ' [manual]' : ' [auto]'));
    }
    var skipPages = profile.skip_pages || [];
    var combinedText = textResult.pages
      .filter(function(p) { return skipPages.indexOf(p.page) === -1; })
      .map(function(p) { return '--- PAGE ' + p.page + ' ---\n' + p.text; })
      .join('\n\n');

    if (combinedText.length > 25000) {
      console.log('  WARNING: Text truncated from ' + combinedText.length + ' to 25000 chars');
      combinedText = combinedText.substring(0, 25000) + '\n[... truncated]';
    }

    // Step 6: Build prompt
    var promptText = promptV2.buildChangePrompt(
      ctx.locationName, ctx.locationCity, ctx.services, combinedText, profile
    );

    if (dryRun) {
      console.log('  Prompt: ' + promptText.length + ' chars (~' + Math.round(promptText.length / 4) + ' tokens)');
      return {
        churchId: churchId,
        status: 'dry_run',
        parish: ctx.parishName,
        services: ctx.services.length,
        textPages: textResult.pages.length,
        promptChars: promptText.length,
      };
    }

    // Step 7: Send to Claude
    console.log('  Sending to Claude...');
    return client.messages.create({
      model: config.PARSE_MODEL,
      max_tokens: 4000,
      messages: [{ role: 'user', content: promptText }]
    }).then(function(response) {
      var inputTokens = response.usage.input_tokens;
      var outputTokens = response.usage.output_tokens;
      var cost = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);

      console.log('  Response: ' + inputTokens + ' in / ' + outputTokens + ' out ($' + cost.toFixed(4) + ')');

      // Parse response
      var rawText = response.content[0].text;
      var parsed = parseJsonResponse(rawText);
      if (!parsed) {
        console.log('  ERROR: Failed to parse JSON response');
        return {
          churchId: churchId,
          status: 'parse_error',
          parish: ctx.parishName,
          cost: cost,
          rawResponse: rawText,
        };
      }

      // Post-process: filter false "modified" where old === new
      if (parsed.modified) {
        var realModified = [];
        parsed.modified.forEach(function(m) {
          var oldVal = String(m.old_value || '').replace(/\s+/g, ' ').trim();
          var newVal = String(m.new_value || '').replace(/\s+/g, ' ').trim();
          if (oldVal === newVal) {
            if (parsed.confirmed.indexOf(m.service_num) === -1) {
              parsed.confirmed.push(m.service_num);
            }
          } else {
            realModified.push(m);
          }
        });
        parsed.modified = realModified;
        parsed.confirmed.sort(function(a, b) { return a - b; });
      }

      var confirmed = parsed.confirmed || [];
      var modified = parsed.modified || [];
      var notFound = parsed.not_found || [];
      var newServices = parsed.new_services || [];
      var events = parsed.events || [];
      var notices = parsed.notices || [];

      // Print compact results
      var total = ctx.services.length;
      var rate = total > 0 ? Math.round((confirmed.length / total) * 100) : 0;
      console.log('  Result: ' + confirmed.length + '/' + total + ' confirmed (' + rate + '%), ' +
        modified.length + ' modified, ' + newServices.length + ' new, ' +
        events.length + ' events, ' + notices.length + ' notices');

      var resultObj = {
        churchId: churchId,
        status: 'success',
        parish: ctx.parishName,
        services: total,
        confirmed: confirmed.length,
        confirmRate: rate,
        modified: modified.length,
        notFound: notFound.length,
        newServices: newServices.length,
        events: events.length,
        notices: notices.length,
        cost: cost,
        textPages: textResult.pages.length,
        result: parsed,
      };

      // Store in Supabase if --store flag
      if (!doStore) return resultObj;

      var bulletinDate = parsed.bulletin_date || getNextSunday();
      console.log('  Storing in Supabase...');
      return storeV2.storeV2Results({
        churchId: churchId,
        bulletinDate: bulletinDate,
        sourceUrl: fetchResult.sourceUrl || null,
        sourceDomain: fetchResult.sourceDomain || null,
        pageCount: textResult.pages.length,
        textQuality: textResult.quality,
        textMethod: textResult.method,
        cost: cost,
        parsed: parsed,
        services: ctx.services,
      }).then(function(storeResult) {
        console.log('  Stored: bulletin #' + storeResult.bulletinId +
          ', ' + storeResult.changeCount + ' changes (' +
          storeResult.autoConfirmed + ' auto-confirmed, ' +
          storeResult.pending + ' pending)');
        resultObj.bulletinId = storeResult.bulletinId;
        resultObj.stored = true;
        return resultObj;
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
  var mm = String(d.getMonth() + 1);
  if (mm.length < 2) mm = '0' + mm;
  var dd = String(d.getDate());
  if (dd.length < 2) dd = '0' + dd;
  return yyyy + '-' + mm + '-' + dd;
}

function parseJsonResponse(text) {
  try { return JSON.parse(text); } catch (e) { /* continue */ }
  var match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch (e2) { /* continue */ }
  }
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) { /* fail */ }
  }
  return null;
}

function printSummary() {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('                  BATCH SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  var success = results.filter(function(r) { return r.status === 'success'; });
  var skipped = results.filter(function(r) { return r.status !== 'success' && r.status !== 'error'; });
  var errors = results.filter(function(r) { return r.status === 'error'; });

  if (success.length > 0) {
    console.log('\nSuccessful (' + success.length + '):');
    console.log('  Church                                    Confirmed  Modified  New  Events  Cost');
    console.log('  ' + '─'.repeat(80));
    success.forEach(function(r) {
      var name = (r.parish || r.churchId).substring(0, 38);
      while (name.length < 40) name += ' ';
      console.log('  ' + name +
        padLeft(r.confirmed + '/' + r.services, 9) + '  ' +
        padLeft(String(r.modified), 8) + '  ' +
        padLeft(String(r.newServices), 3) + '  ' +
        padLeft(String(r.events), 6) + '  $' + (r.cost || 0).toFixed(4));
    });

    var totalConfirmed = success.reduce(function(s, r) { return s + r.confirmed; }, 0);
    var totalServices = success.reduce(function(s, r) { return s + r.services; }, 0);
    var avgRate = totalServices > 0 ? Math.round((totalConfirmed / totalServices) * 100) : 0;
    console.log('  ' + '─'.repeat(80));
    console.log('  Total: ' + totalConfirmed + '/' + totalServices + ' confirmed (' + avgRate + '%)');
  }

  if (skipped.length > 0) {
    console.log('\nSkipped (' + skipped.length + '):');
    skipped.forEach(function(r) {
      console.log('  ' + (r.parish || r.churchId) + ' — ' + r.status);
    });
  }

  if (errors.length > 0) {
    console.log('\nErrors (' + errors.length + '):');
    errors.forEach(function(r) {
      console.log('  ' + r.churchId + ' — ' + r.error);
    });
  }

  console.log('\nTotal cost: $' + totalCost.toFixed(4));

  // Write results to file
  var outputPath = path.resolve(__dirname, '../../.tmp-v2-batch-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  console.log('Results written to: ' + outputPath);
}

function padLeft(str, len) {
  while (str.length < len) str = ' ' + str;
  return str;
}
