// store-results-v2.js — Store v2 pipeline results in Supabase
// Writes to bulletins (run metadata) + bulletin_changes (change items)

var config = require('./config');
var sb = require('@supabase/supabase-js');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Store v2 pipeline results.
 *
 * @param {object} opts
 * @param {string} opts.churchId
 * @param {string} opts.bulletinDate - YYYY-MM-DD
 * @param {string} opts.sourceUrl
 * @param {string} opts.sourceDomain
 * @param {number} opts.pageCount
 * @param {string} opts.textQuality - good, low, empty
 * @param {string} opts.textMethod - text, vision_needed
 * @param {number} opts.cost
 * @param {object} opts.parsed - the Claude response (confirmed, modified, etc.)
 * @param {Array} opts.services - numbered service list from getChurchContext
 * @returns {Promise<object>} { bulletinId, changeCount, autoConfirmed }
 */
function storeV2Results(opts) {
  var parsed = opts.parsed;
  var confirmed = parsed.confirmed || [];
  var modified = parsed.modified || [];
  var notFound = parsed.not_found || [];
  var newServices = parsed.new_services || [];
  var events = parsed.events || [];
  var notices = parsed.notices || [];

  // Step 1: Upsert bulletin run
  return supabase.from('bulletins').upsert({
    church_id: opts.churchId,
    bulletin_date: opts.bulletinDate,
    source_url: opts.sourceUrl || null,
    source_domain: opts.sourceDomain || null,
    page_count: opts.pageCount || null,
    pipeline_version: 2,
    text_quality: opts.textQuality || null,
    text_method: opts.textMethod || null,
    services_confirmed: confirmed.length,
    services_total: (opts.services || []).length,
    parse_cost_usd: opts.cost || 0,
    parse_model: config.PARSE_MODEL,
    status: 'parsed',
    parsed_at: new Date().toISOString(),
    raw_extraction: parsed,
  }, { onConflict: 'church_id,bulletin_date' })
  .select('id')
  .then(function(res) {
    if (res.error) throw new Error('Bulletin upsert failed: ' + res.error.message);
    var bulletinId = res.data[0].id;

    // Step 2: Delete old changes for this bulletin (re-run safe)
    return supabase.from('bulletin_changes')
      .delete()
      .eq('bulletin_id', bulletinId)
      .then(function(delRes) {
        if (delRes.error) throw new Error('Delete old changes failed: ' + delRes.error.message);

        // Step 3: Build change rows
        var rows = [];
        var serviceMap = {};
        (opts.services || []).forEach(function(svc) {
          serviceMap[svc.num] = svc;
        });

        // Confirmed
        confirmed.forEach(function(num) {
          var svc = serviceMap[num];
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'confirmed',
            service_num: num,
            service_id: svc ? svc.id : null,
            status: 'auto_confirmed',
          });
        });

        // Modified
        modified.forEach(function(m) {
          var svc = serviceMap[m.service_num];
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'modified',
            service_num: m.service_num,
            service_id: svc ? svc.id : null,
            field_changed: m.field || null,
            old_value: m.old_value != null ? String(m.old_value) : null,
            new_value: m.new_value != null ? String(m.new_value) : null,
            confidence: m.confidence || null,
            status: 'pending',
          });
        });

        // Not found
        notFound.forEach(function(num) {
          var svc = serviceMap[num];
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'not_found',
            service_num: num,
            service_id: svc ? svc.id : null,
            status: 'auto_confirmed',
          });
        });

        // New services
        newServices.forEach(function(ns) {
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'new_service',
            service_type: ns.type || null,
            day: ns.day || null,
            time: ns.time || null,
            end_time: ns.end_time || null,
            language: ns.language || null,
            seasonal: ns.seasonal || null,
            notes: ns.notes || null,
            confidence: ns.confidence || null,
            status: 'pending',
          });
        });

        // Events
        events.forEach(function(ev) {
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'event',
            title: ev.title || null,
            description: ev.description || null,
            event_date: ev.date || null,
            event_time: ev.time || null,
            event_end_time: ev.end_time || null,
            location: ev.location || null,
            category: ev.category || null,
            confidence: ev.confidence || null,
            status: 'pending',
          });
        });

        // Notices
        notices.forEach(function(n) {
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'notice',
            title: n.title || null,
            description: n.details || null,
            effective_date: n.effective_date || null,
            confidence: n.confidence || null,
            status: 'pending',
          });
        });

        if (rows.length === 0) {
          return {
            bulletinId: bulletinId,
            changeCount: 0,
            autoConfirmed: 0,
          };
        }

        // Step 4: Insert all change rows
        return supabase.from('bulletin_changes')
          .insert(rows)
          .then(function(insRes) {
            if (insRes.error) throw new Error('Insert changes failed: ' + insRes.error.message);

            var autoConfirmed = rows.filter(function(r) {
              return r.status === 'auto_confirmed';
            }).length;

            return {
              bulletinId: bulletinId,
              changeCount: rows.length,
              autoConfirmed: autoConfirmed,
              pending: rows.length - autoConfirmed,
            };
          });
      });
  });
}

module.exports = {
  storeV2Results: storeV2Results,
};
