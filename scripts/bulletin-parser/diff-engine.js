// diff-engine.js — Compare this week's items against last week's
// Marks items as is_new: false if they match a previous item

var config = require('./config');
var sb = require('@supabase/supabase-js');
var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Compare new items against the previous bulletin's items.
 * Updates is_new flag in Supabase for items that match.
 *
 * @param {number} bulletinId - current bulletin ID
 * @param {string} churchId
 * @returns {Promise<{total: number, unchanged: number, new: number}>}
 */
function markUnchanged(bulletinId, churchId) {
  // Get current items
  return supabase.from('bulletin_items')
    .select('id, category, title, event_date, event_time')
    .eq('bulletin_id', bulletinId)
    .then(function(currentRes) {
      if (currentRes.error) throw new Error(currentRes.error.message);
      var currentItems = currentRes.data || [];

      if (currentItems.length === 0) {
        return { total: 0, unchanged: 0, new: 0 };
      }

      // Find the previous bulletin for this church
      return supabase.from('bulletins')
        .select('id')
        .eq('church_id', churchId)
        .neq('id', bulletinId)
        .order('bulletin_date', { ascending: false })
        .limit(1)
        .then(function(prevRes) {
          if (prevRes.error) throw new Error(prevRes.error.message);
          if (!prevRes.data || prevRes.data.length === 0) {
            // No previous bulletin — everything is new
            return { total: currentItems.length, unchanged: 0, new: currentItems.length };
          }

          var prevBulletinId = prevRes.data[0].id;

          // Get previous items
          return supabase.from('bulletin_items')
            .select('category, title, event_date, event_time')
            .eq('bulletin_id', prevBulletinId)
            .then(function(prevItemsRes) {
              if (prevItemsRes.error) throw new Error(prevItemsRes.error.message);
              var prevItems = prevItemsRes.data || [];

              // Match current items against previous
              var unchangedIds = [];
              currentItems.forEach(function(curr) {
                var match = prevItems.some(function(prev) {
                  return fuzzyMatch(curr, prev);
                });
                if (match) {
                  unchangedIds.push(curr.id);
                }
              });

              if (unchangedIds.length === 0) {
                return {
                  total: currentItems.length,
                  unchanged: 0,
                  new: currentItems.length,
                };
              }

              // Batch update is_new = false for matched items
              return supabase.from('bulletin_items')
                .update({ is_new: false })
                .in('id', unchangedIds)
                .then(function() {
                  return {
                    total: currentItems.length,
                    unchanged: unchangedIds.length,
                    new: currentItems.length - unchangedIds.length,
                  };
                });
            });
        });
    });
}

/**
 * Fuzzy match two items.
 * Matches if same category AND similar title AND same date/time.
 */
function fuzzyMatch(a, b) {
  // Must be same category
  if (a.category !== b.category) return false;

  // If both have dates, they must match
  if (a.event_date && b.event_date && a.event_date !== b.event_date) return false;

  // Title similarity — simple normalized comparison
  var titleA = normalize(a.title);
  var titleB = normalize(b.title);

  // Exact match after normalization
  if (titleA === titleB) return true;

  // One contains the other
  if (titleA.indexOf(titleB) !== -1 || titleB.indexOf(titleA) !== -1) return true;

  // Levenshtein distance relative to length
  var maxLen = Math.max(titleA.length, titleB.length);
  if (maxLen === 0) return true;
  var dist = levenshtein(titleA, titleB);
  return (dist / maxLen) < 0.3; // Less than 30% different
}

function normalize(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Simple Levenshtein distance.
 */
function levenshtein(a, b) {
  var m = a.length;
  var n = b.length;
  var dp = [];
  for (var i = 0; i <= m; i++) {
    dp[i] = [i];
    for (var j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j : 0;
    }
  }
  for (var i = 1; i <= m; i++) {
    for (var j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

module.exports = {
  markUnchanged: markUnchanged,
  fuzzyMatch: fuzzyMatch,
};
