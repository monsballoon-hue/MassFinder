// review-cli.js — Terminal-based review of parsed bulletin items
// Usage: node scripts/bulletin-parser/index.js --review

var config = require('./config');
var sb = require('@supabase/supabase-js');
var readline = require('readline');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

function run() {
  console.log('=== BULLETIN REVIEW ===\n');
  console.log('Loading pending items...\n');

  // Get all pending items grouped by church
  supabase.from('bulletin_items')
    .select('id, bulletin_id, church_id, category, title, description, event_date, event_time, end_time, location, contact_name, contact_phone, confidence, is_new, source_page, tags, recurring')
    .eq('status', 'pending')
    .order('church_id')
    .order('is_new', { ascending: false })
    .order('confidence', { ascending: false })
    .then(function(res) {
      if (res.error) {
        console.error('Error loading items:', res.error.message);
        process.exit(1);
      }

      var items = res.data || [];
      if (items.length === 0) {
        console.log('No pending items to review.');
        process.exit(0);
      }

      // Group by church
      var churches = {};
      items.forEach(function(item) {
        if (!churches[item.church_id]) churches[item.church_id] = [];
        churches[item.church_id].push(item);
      });

      var churchIds = Object.keys(churches);
      var totalNew = items.filter(function(i) { return i.is_new; }).length;
      var totalUnchanged = items.length - totalNew;

      console.log(items.length + ' pending items across ' + churchIds.length + ' churches');
      console.log(totalNew + ' new, ' + totalUnchanged + ' unchanged\n');
      console.log('Commands: [a]pprove  [r]eject  [s]kip  [u] approve all unchanged  [h] approve high-confidence  [q]uit\n');

      var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      var approved = 0;
      var rejected = 0;
      var skipped = 0;

      function reviewChurch(ci) {
        if (ci >= churchIds.length) {
          finish();
          return;
        }

        var churchId = churchIds[ci];
        var churchItems = churches[churchId];
        var newCount = churchItems.filter(function(i) { return i.is_new; }).length;

        console.log('\n--- ' + churchId + ' (' + churchItems.length + ' items, ' + newCount + ' new) ---\n');

        reviewItem(churchItems, 0, function() {
          reviewChurch(ci + 1);
        });
      }

      function reviewItem(churchItems, ii, done) {
        if (ii >= churchItems.length) {
          done();
          return;
        }

        var item = churchItems[ii];
        var badge = item.is_new ? '\x1b[33m[NEW]\x1b[0m' : '\x1b[36m[UNCHANGED]\x1b[0m';
        var confColor = item.confidence >= 0.9 ? '\x1b[32m' : (item.confidence >= 0.7 ? '\x1b[33m' : '\x1b[31m');

        console.log(badge + ' ' + item.category + ' | ' + item.title);
        if (item.description) {
          console.log('  ' + item.description.substring(0, 160));
        }
        var details = [];
        if (item.event_date) details.push('Date: ' + item.event_date + (item.event_time ? ' ' + item.event_time : ''));
        if (item.end_time) details.push('End: ' + item.end_time);
        if (item.location) details.push('Location: ' + item.location);
        if (item.recurring) details.push('Recurring: ' + item.recurring);
        if (item.contact_name) details.push('Contact: ' + item.contact_name + (item.contact_phone ? ' ' + item.contact_phone : ''));
        if (item.tags && item.tags.length) details.push('Tags: ' + item.tags.join(', '));
        if (details.length) console.log('  ' + details.join(' | '));
        console.log('  ' + confColor + 'Confidence: ' + item.confidence + '\x1b[0m  |  Page: ' + item.source_page);

        rl.question('  [a/r/s/u/h/q] > ', function(answer) {
          var cmd = (answer || '').trim().toLowerCase();

          if (cmd === 'a') {
            updateStatus(item.id, 'approved').then(function() {
              approved++;
              reviewItem(churchItems, ii + 1, done);
            });
          } else if (cmd === 'r') {
            updateStatus(item.id, 'rejected').then(function() {
              rejected++;
              reviewItem(churchItems, ii + 1, done);
            });
          } else if (cmd === 's' || cmd === '') {
            skipped++;
            reviewItem(churchItems, ii + 1, done);
          } else if (cmd === 'u') {
            // Approve all unchanged in this church
            var unchangedIds = churchItems.filter(function(i) { return !i.is_new; }).map(function(i) { return i.id; });
            if (unchangedIds.length === 0) {
              console.log('  No unchanged items to approve');
              reviewItem(churchItems, ii, done);
              return;
            }
            batchApprove(unchangedIds).then(function() {
              console.log('  Approved ' + unchangedIds.length + ' unchanged items');
              approved += unchangedIds.length;
              // Continue with remaining new items
              var remaining = churchItems.filter(function(i) { return i.is_new; });
              reviewItem(remaining, 0, done);
            });
          } else if (cmd === 'h') {
            // Approve all high-confidence items in this church
            var highConfIds = churchItems.filter(function(i) {
              return i.confidence >= config.CONFIDENCE_AUTO_APPROVE && i.status === 'pending';
            }).map(function(i) { return i.id; });
            if (highConfIds.length === 0) {
              console.log('  No high-confidence items to approve');
              reviewItem(churchItems, ii, done);
              return;
            }
            batchApprove(highConfIds).then(function() {
              console.log('  Approved ' + highConfIds.length + ' high-confidence items');
              approved += highConfIds.length;
              // Continue with remaining low-confidence items
              var remaining = churchItems.filter(function(i) {
                return i.confidence < config.CONFIDENCE_AUTO_APPROVE;
              });
              reviewItem(remaining, 0, done);
            });
          } else if (cmd === 'q') {
            finish();
            return;
          } else {
            console.log('  Unknown command. Use a/r/s/u/h/q');
            reviewItem(churchItems, ii, done);
          }
        });
      }

      function finish() {
        console.log('\n━━━ REVIEW COMPLETE ━━━');
        console.log('Approved: ' + approved);
        console.log('Rejected: ' + rejected);
        console.log('Skipped:  ' + skipped);
        rl.close();
        process.exit(0);
      }

      reviewChurch(0);
    });
}

function updateStatus(itemId, status) {
  return supabase.from('bulletin_items')
    .update({ status: status })
    .eq('id', itemId)
    .then(function(res) {
      if (res.error) console.error('  Update error:', res.error.message);
    });
}

function batchApprove(ids) {
  return supabase.from('bulletin_items')
    .update({ status: 'approved' })
    .in('id', ids)
    .then(function(res) {
      if (res.error) console.error('  Batch update error:', res.error.message);
    });
}

module.exports = { run: run };
