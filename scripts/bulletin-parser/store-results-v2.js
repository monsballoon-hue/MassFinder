// store-results-v2.js — Store v2 pipeline results in Supabase
// Writes to bulletins (run metadata) + bulletin_changes (change items)

var path = require('path');
var fs = require('fs');
var config = require('./config');
var sb = require('@supabase/supabase-js');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// Build location lookup: location_id → { name, address, city, state, zip, lat, lng }
var parishData = JSON.parse(fs.readFileSync(
  path.resolve(__dirname, '../../parish_data.json'), 'utf8'
));
var locationLookup = {};
parishData.parishes.forEach(function(p) {
  (p.locations || []).forEach(function(loc) {
    locationLookup[loc.id] = {
      name: loc.name || p.name,
      address: loc.address || null,
      city: loc.city || p.town,
      state: loc.state || p.state,
      zip: loc.zip || p.zip,
      lat: loc.lat || null,
      lng: loc.lng || null,
    };
  });
});

/**
 * Resolve event location into venue_name + venue_address.
 * If Claude extracted a relative name ("Parish Hall"), use it as venue_name
 * and fill venue_address from the church's known address.
 * If Claude extracted a full address (contains digits + comma), keep as venue_address.
 */
function resolveVenue(rawLocation, churchId) {
  var churchInfo = locationLookup[churchId];
  var churchAddress = churchInfo ? churchInfo.address : null;

  if (!rawLocation) {
    return { venue_name: churchInfo ? churchInfo.name : null, venue_address: churchAddress };
  }

  // Heuristic: if it contains a street number and comma, it's likely a full address
  var looksLikeAddress = /\d+\s+\w+.*,/.test(rawLocation);
  if (looksLikeAddress) {
    return { venue_name: rawLocation.split(',')[0].trim(), venue_address: rawLocation };
  }

  // Relative location — use as display name, fill address from church
  return { venue_name: rawLocation, venue_address: churchAddress };
}

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
            source_page: m.source_page || null,
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
            source_page: ns.source_page || null,
            confidence: ns.confidence || null,
            status: 'pending',
          });
        });

        // Events — 3 scheduling modes (recurrence_type discriminator):
        //   once   → event_date only
        //   series → dates[] array, event_date = first, effective_date = last
        //   weekly → day column, optional event_date (start), optional effective_date (end)
        events.forEach(function(ev) {
          var dates = ev.dates && ev.dates.length > 1 ? ev.dates : null; // only for series
          var day = ev.day || null; // weekly recurring
          var recurrenceType = day ? 'weekly' : (dates ? 'series' : 'once');
          var firstDate = dates ? dates[0] : (ev.date || null);
          var lastDate = dates ? dates[dates.length - 1] : null;
          // effective_date: explicit end_date from Claude, or last date in series
          var effectiveDate = ev.end_date || lastDate || null;
          var venue = resolveVenue(ev.location, opts.churchId);
          rows.push({
            bulletin_id: bulletinId,
            church_id: opts.churchId,
            change_type: 'event',
            recurrence_type: recurrenceType,
            title: ev.title || null,
            description: ev.description || null,
            day: day,
            dates: dates, // TEXT[] — only for series
            event_date: day ? (ev.date || null) : firstDate, // recurring: start date if given
            event_time: ev.time || null,
            event_end_time: ev.end_time || null,
            effective_date: effectiveDate,
            location: ev.location || null, // raw text for reference
            venue_name: venue.venue_name,
            venue_address: venue.venue_address,
            category: ev.category || null,
            seasonal: ev.seasonal || null,
            source_page: ev.source_page || null,
            confidence: ev.confidence || null,
            notes: ev.notes || null, // Claude's raw notes only, no encoding
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
            source_page: n.source_page || null,
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
