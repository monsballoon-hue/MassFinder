// store-results.js — Store parsed bulletin results in Supabase

var config = require('./config');
var sb = require('@supabase/supabase-js');
var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Store a parsed bulletin and its items in Supabase.
 * @param {object} opts
 * @param {string} opts.churchId
 * @param {string} opts.bulletinDate - YYYY-MM-DD
 * @param {string} opts.sourceUrl
 * @param {string} opts.sourceDomain
 * @param {number} opts.pageCount
 * @param {object[]} opts.allItems - extracted items from parseAllPages
 * @param {object[]} opts.pageResults - per-page results
 * @param {number} opts.totalCost
 * @returns {Promise<{bulletinId: number, itemCount: number}>}
 */
function storeResults(opts) {
  // Upsert bulletin row
  return supabase.from('bulletins').upsert({
    church_id: opts.churchId,
    bulletin_date: opts.bulletinDate,
    source_url: opts.sourceUrl,
    source_domain: opts.sourceDomain,
    page_count: opts.pageCount,
    status: 'parsed',
    parsed_at: new Date().toISOString(),
    raw_extraction: {
      items: opts.allItems,
      pageResults: opts.pageResults.map(function(pr) {
        return { page_type: pr.page_type, notes: pr.notes, item_count: pr.items.length };
      }),
    },
    parse_cost_usd: opts.totalCost,
    parse_model: config.PARSE_MODEL,
  }, { onConflict: 'church_id,bulletin_date' })
  .select('id')
  .single()
  .then(function(res) {
    if (res.error) throw new Error('Bulletin upsert failed: ' + res.error.message);

    var bulletinId = res.data.id;

    // Delete any existing items for this bulletin (in case of re-parse)
    return supabase.from('bulletin_items')
      .delete()
      .eq('bulletin_id', bulletinId)
      .then(function() {
        // Insert new items
        if (opts.allItems.length === 0) {
          return { bulletinId: bulletinId, itemCount: 0 };
        }

        var rows = opts.allItems.map(function(item) {
          return {
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            category: item.category,
            title: item.title,
            description: item.description,
            event_date: item.event_date,
            event_time: item.event_time,
            end_time: item.end_time,
            end_date: item.end_date,
            location: item.location,
            contact_name: item.contact_name,
            contact_phone: item.contact_phone,
            contact_email: item.contact_email,
            registration_url: item.registration_url,
            recurring: item.recurring,
            tags: item.tags,
            source_page: item.source_page,
            confidence: item.confidence,
            is_new: true,
            status: 'pending',
          };
        });

        return supabase.from('bulletin_items')
          .insert(rows)
          .then(function(insertRes) {
            if (insertRes.error) throw new Error('Items insert failed: ' + insertRes.error.message);
            return { bulletinId: bulletinId, itemCount: rows.length };
          });
      });
  });
}

module.exports = {
  storeResults: storeResults,
  supabase: supabase,
};
