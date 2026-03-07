#!/usr/bin/env node
// test-v2.js — Test harness for v2 change-detection pipeline
// Usage:
//   node scripts/bulletin-parser/test-v2.js <church-id>            # full run
//   node scripts/bulletin-parser/test-v2.js <church-id> --dry-run  # print prompt only

var fs = require('fs');
var path = require('path');
var Anthropic = require('@anthropic-ai/sdk');
var config = require('./config');
var extractor = require('./extract-text');
var loader = require('./load-services');
var promptV2 = require('./prompt-v2');

// Load parish profiles
var profilesPath = path.resolve(__dirname, 'parish-profiles.json');
var allProfiles = {};
try {
  allProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
} catch (e) { /* no profiles */ }

// Parse CLI args
var args = process.argv.slice(2);
var churchId = null;
var dryRun = false;

for (var a = 0; a < args.length; a++) {
  if (args[a] === '--dry-run') {
    dryRun = true;
  } else if (!args[a].startsWith('--')) {
    churchId = args[a];
  }
}

if (!churchId) {
  console.error('Usage: node scripts/bulletin-parser/test-v2.js <church-id> [--dry-run]');
  console.error('');
  console.error('Available PDFs:');
  var pdfDir = path.resolve(__dirname, '../../bulletins-manual');
  if (fs.existsSync(pdfDir)) {
    fs.readdirSync(pdfDir).filter(function(f) { return f.endsWith('.pdf'); }).forEach(function(f) {
      console.error('  ' + f.replace('.pdf', ''));
    });
  }
  process.exit(1);
}

// Find PDF
var pdfPath = path.resolve(__dirname, '../../bulletins-manual', churchId + '.pdf');
if (!fs.existsSync(pdfPath)) {
  console.error('PDF not found: ' + pdfPath);
  process.exit(1);
}

console.log('=== V2 Change Detection Test ===');
console.log('Church: ' + churchId);
console.log('PDF:    ' + pdfPath);
console.log('Mode:   ' + (dryRun ? 'DRY RUN (no API call)' : 'FULL RUN'));
console.log('');

// Step 1: Load known services
var ctx = loader.getChurchContext(churchId);
if (!ctx) {
  console.error('ERROR: Church not found in parish_data.json: ' + churchId);
  process.exit(1);
}
console.log('Parish: ' + ctx.parishName + ' (' + ctx.locationName + ')');
console.log('Known services: ' + ctx.services.length);
console.log('Clergy: ' + ctx.clergy.map(function(c) { return c.role + ': ' + c.name; }).join(', '));
console.log('');

// Step 2: Extract text from PDF
console.log('Extracting text from PDF...');
var pdfBuffer = fs.readFileSync(pdfPath);
var textResult = extractor.extractText(pdfBuffer);

console.log('Text extraction: method=' + textResult.method + ', quality=' + textResult.quality + ', pages=' + textResult.pages.length);
textResult.pages.forEach(function(p) {
  console.log('  Page ' + p.page + ': ' + p.charCount + ' alpha chars');
});
console.log('');

if (textResult.method === 'vision_needed') {
  console.error('ERROR: Text extraction failed (quality: ' + textResult.quality + '). This church needs Vision fallback.');
  process.exit(1);
}

// Step 3: Build profile — auto-classify, then overlay manual profile
var autoClass = loader.getChurchClassification(churchId);
var manualProfile = allProfiles[churchId] || {};
var profile = {};

// Start with manual profile fields (skip_pages, parsing_notes, etc.)
Object.keys(manualProfile).forEach(function(k) { profile[k] = manualProfile[k]; });

// Auto-derive multi-church context if not manually specified
if (autoClass && autoClass.isMultiChurch && !profile.target_location) {
  profile.target_location = autoClass.target_location;
  profile.sibling_locations = autoClass.sibling_locations;
}

if (profile.target_location) {
  console.log('Profile loaded (multi-church, target: ' + profile.target_location +
    ', siblings: ' + (profile.sibling_locations || []).join(', ') +
    (manualProfile.target_location ? ' [manual]' : ' [auto]') + ')');
} else if (Object.keys(manualProfile).length) {
  console.log('Profile loaded (single-church)');
} else {
  console.log('No profile (single-church, auto-classified)');
}

var skipPages = (profile && profile.skip_pages) || [];
var combinedText = textResult.pages
  .filter(function(p) { return skipPages.indexOf(p.page) === -1; })
  .map(function(p) { return '--- PAGE ' + p.page + ' ---\n' + p.text; })
  .join('\n\n');

// Truncate if very long (25K chars ≈ 6K tokens — well within Sonnet's context)
if (combinedText.length > 25000) {
  console.log('WARNING: Bulletin text truncated from ' + combinedText.length + ' to 25000 chars');
  combinedText = combinedText.substring(0, 25000) + '\n[... truncated]';
}

// Step 4: Build prompt
var promptText = promptV2.buildChangePrompt(
  ctx.locationName, ctx.locationCity, ctx.services, combinedText, profile
);

var approxTokens = Math.round(promptText.length / 4);
console.log('Prompt length: ' + promptText.length + ' chars (~' + approxTokens + ' tokens)');
console.log('');

if (dryRun) {
  console.log('━━━ PROMPT (dry run) ━━━');
  console.log(promptText);
  console.log('━━━ END PROMPT ━━━');
  console.log('');
  console.log('Service table:');
  console.log(loader.formatServicesForPrompt(ctx.services));
  process.exit(0);
}

// Step 5: Send to Claude
console.log('Sending to Claude (' + config.PARSE_MODEL + ', text mode)...');

var client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

client.messages.create({
  model: config.PARSE_MODEL,
  max_tokens: 4000,
  messages: [{ role: 'user', content: promptText }]
}).then(function(response) {
  var inputTokens = response.usage.input_tokens;
  var outputTokens = response.usage.output_tokens;
  var cost = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);

  console.log('Response: ' + inputTokens + ' in / ' + outputTokens + ' out');
  console.log('Cost: $' + cost.toFixed(4));
  console.log('');

  // Parse JSON response
  var rawText = response.content[0].text;
  var parsed = parseJsonResponse(rawText);
  if (!parsed) {
    console.error('ERROR: Failed to parse JSON response');
    console.log('Raw response:');
    console.log(rawText);
    process.exit(1);
  }

  // Post-process: filter false "modified" where old === new
  if (parsed.modified) {
    var realModified = [];
    parsed.modified.forEach(function(m) {
      var oldVal = String(m.old_value || '').replace(/\s+/g, ' ').trim();
      var newVal = String(m.new_value || '').replace(/\s+/g, ' ').trim();
      if (oldVal === newVal) {
        // Move to confirmed
        if (parsed.confirmed.indexOf(m.service_num) === -1) {
          parsed.confirmed.push(m.service_num);
        }
        console.log('  [auto-fix] #' + m.service_num + ' false modified (same values) → confirmed');
      } else {
        realModified.push(m);
      }
    });
    parsed.modified = realModified;
    parsed.confirmed.sort(function(a, b) { return a - b; });
  }

  // Report results
  reportResults(parsed, ctx);

  // Write full output
  var outputPath = path.resolve(__dirname, '../../.tmp-test-v2-output.json');
  var output = {
    church_id: churchId,
    parish: ctx.parishName,
    location: ctx.locationName,
    known_services: ctx.services.length,
    text_pages: textResult.pages.length,
    text_quality: textResult.quality,
    prompt_tokens: approxTokens,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost: cost,
    result: parsed,
    raw_response: rawText
  };
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log('\nFull output written to: ' + outputPath);

}).catch(function(err) {
  console.error('API error: ' + err.message);
  process.exit(1);
});

function parseJsonResponse(text) {
  // Try direct parse
  try {
    return JSON.parse(text);
  } catch (e) { /* continue */ }

  // Try extracting from markdown code block
  var match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1]); } catch (e2) { /* continue */ }
  }

  // Try finding first { to last }
  var start = text.indexOf('{');
  var end = text.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.substring(start, end + 1)); } catch (e3) { /* fail */ }
  }

  return null;
}

function reportResults(parsed, ctx) {
  var confirmed = parsed.confirmed || [];
  var modified = parsed.modified || [];
  var notFound = parsed.not_found || [];
  var newServices = parsed.new_services || [];
  var events = parsed.events || [];
  var notices = parsed.notices || [];

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('         RESULTS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Confirmed
  console.log('Confirmed: ' + confirmed.length + '/' + ctx.services.length + ' services');
  if (confirmed.length > 0) {
    var confirmedList = confirmed.map(function(num) {
      var svc = ctx.services[num - 1];
      return svc ? ('  ' + num + '. ' + svc.type + ' ' + (svc.day || '') + ' ' + (svc.time || '')) : ('  ' + num + '. ???');
    });
    confirmedList.forEach(function(line) { console.log(line); });
  }

  // Modified
  if (modified.length > 0) {
    console.log('\nMODIFIED: ' + modified.length + ' service(s):');
    modified.forEach(function(m) {
      var svc = ctx.services[m.service_num - 1];
      var label = svc ? (svc.type + ' ' + (svc.day || '') + ' ' + (svc.time || '')) : ('#' + m.service_num);
      console.log('  #' + m.service_num + ' ' + label + ': ' + m.field + ' ' + m.old_value + ' -> ' + m.new_value +
        ' (conf: ' + m.confidence + ')');
    });
  }

  // Not found
  if (notFound.length > 0) {
    console.log('\nNot found in bulletin: ' + notFound.length + ' service(s)');
    notFound.forEach(function(num) {
      var svc = ctx.services[num - 1];
      var label = svc ? (svc.type + ' ' + (svc.day || '') + ' ' + (svc.time || '')) : '???';
      var seasonal = svc && svc.seasonal && svc.seasonal.is_seasonal ? ' {' + svc.seasonal.season + '}' : '';
      console.log('  ' + num + '. ' + label + seasonal);
    });
  }

  // New services
  if (newServices.length > 0) {
    console.log('\nNEW SERVICES: ' + newServices.length);
    newServices.forEach(function(ns) {
      console.log('  ' + ns.type + ' ' + (ns.day || '') + ' ' + (ns.time || '') +
        (ns.seasonal ? ' {' + ns.seasonal + '}' : '') +
        (ns.notes ? ' (' + ns.notes + ')' : '') +
        ' (conf: ' + ns.confidence + ')');
    });
  }

  // Events
  if (events.length > 0) {
    console.log('\nEVENTS: ' + events.length);
    events.forEach(function(ev) {
      console.log('  ' + ev.title + ' | ' + (ev.date || 'no date') + ' ' + (ev.time || '') +
        (ev.category ? ' [' + ev.category + ']' : '') +
        ' (conf: ' + (ev.confidence || '?') + ')');
    });
  }

  // Notices
  if (notices.length > 0) {
    console.log('\nNOTICES: ' + notices.length);
    notices.forEach(function(n) {
      console.log('  ' + n.title + (n.effective_date ? ' (effective: ' + n.effective_date + ')' : ''));
    });
  }

  // Clergy
  if (parsed.clergy && parsed.clergy.length) {
    console.log('\nClergy: ' + parsed.clergy.map(function(c) { return c.role + ': ' + c.name; }).join(', '));
  }

  // Summary
  var total = ctx.services.length;
  var coverageRate = total > 0 ? Math.round((confirmed.length / total) * 100) : 0;
  console.log('\n━━━ SUMMARY ━━━');
  console.log('Coverage: ' + confirmed.length + '/' + total + ' confirmed (' + coverageRate + '%)');
  console.log('Changes: ' + modified.length + ' modified, ' + newServices.length + ' new');
  console.log('Events: ' + events.length + ', Notices: ' + notices.length);
  console.log('Not found: ' + notFound.length + ' (informational — may not be in this week\'s bulletin)');
}
