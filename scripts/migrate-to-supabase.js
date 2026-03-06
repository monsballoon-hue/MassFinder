// scripts/migrate-to-supabase.js
// Transforms parish_data.json + events.json into church-centric Supabase rows.
// Run with: nvm use 20 && node scripts/migrate-to-supabase.js

var fs = require('fs');
var path = require('path');
var { createClient } = require('@supabase/supabase-js');

// ── Load .env.local ──
function loadEnv() {
  var envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('ERROR: .env.local not found at', envPath);
    process.exit(1);
  }
  var lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;
    var eq = line.indexOf('=');
    if (eq < 0) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Worship location types (create churches for these only) ──
var WORSHIP_TYPES = ['church', 'chapel', 'mission', 'shrine', 'cathedral'];
function isWorshipLocation(loc) {
  // Locations with worship types, OR locations with no type but church-like name
  if (!loc.type) return /church|chapel|basilica|cathedral|shrine|oratory/i.test(loc.name || '');
  return WORSHIP_TYPES.indexOf(loc.type) >= 0;
}

// ── Determine primary location (most services, worship locations only) ──
function getPrimaryLocationId(parish) {
  var locs = (parish.locations || []).filter(isWorshipLocation);
  if (locs.length === 0) {
    // No worship locations — fall back to first location
    var allLocs = parish.locations || [];
    return allLocs[0] ? allLocs[0].id : null;
  }
  if (locs.length <= 1) return locs[0].id;
  var counts = {};
  locs.forEach(function(l) { counts[l.id] = 0; });
  (parish.services || []).forEach(function(s) {
    if (s.location_id && counts[s.location_id] !== undefined) {
      counts[s.location_id]++;
    }
  });
  var bestId = locs[0].id;
  var bestN = counts[locs[0].id] || 0;
  for (var i = 1; i < locs.length; i++) {
    var n = counts[locs[i].id] || 0;
    if (n > bestN) { bestId = locs[i].id; bestN = n; }
  }
  return bestId;
}

// ── Build church row from a parish + one of its locations ──
function buildChurchRow(parish, location, bulletinGroup) {
  var contact = parish.contact || {};
  return {
    id: location.id,
    name: location.name || parish.name,
    short_name: location.short_name || null,
    type: location.type || 'church',
    address: location.address || null,
    city: location.city || parish.town,
    state: location.state || parish.state,
    zip: location.zip || parish.zip || null,
    county: parish.county || null,
    lat: location.lat || null,
    lng: location.lng || null,
    phone: contact.phone || null,
    phone_secondary: contact.phone_secondary || null,
    website: contact.website || null,
    emails: contact.emails || [],
    office_hours: contact.office_hours || null,
    office_address: contact.office_address || null,
    mailing_address: contact.mailing_address || null,
    instagram: contact.instagram || null,
    facebook: contact.facebook || null,
    contact_notes: contact.notes || null,
    established: parish.established || null,
    status: parish.status || 'active',
    is_accessible: location.is_accessible != null ? location.is_accessible : (parish.is_accessible != null ? parish.is_accessible : null),
    accessibility_notes: location.accessibility_notes || null,
    bulletin_url: parish.bulletin_url || null,
    bulletin_group: bulletinGroup,
    bulletin_url_note: (contact.bulletin_url_note || null),
    clergy: parish.clergy || null,
    staff: parish.staff || [],
    validation: parish.validation || null,
    visitation: parish.visitation || null,
    notes: location.notes || null,
    data: {
      legacy_parish_id: parish.id,
      legacy_parish_name: parish.name,
      is_mission: parish.is_mission || false,
      mission_of: parish.mission_of || null
    }
  };
}

// ── Build service row ──
function buildServiceRow(service, churchId) {
  return {
    id: service.id,
    church_id: churchId,
    type: service.type,
    day: service.day || null,
    time: service.time || null,
    end_time: service.end_time || null,
    language: service.language || 'en',
    languages: service.languages || null,
    notes: service.notes || null,
    title: service.title || null,
    category: service.category || null,
    times_vary: service.times_vary || false,
    time_is_inferred: service.time_is_inferred || false,
    perpetual: service.perpetual || false,
    rite: service.rite || null,
    status: service.status || 'active',
    source: service.source || null,
    date: service.date || null,
    effective_date: service.effective_date || null,
    end_date: service.end_date || null,
    note_expires: service.note_expires || null,
    location: service.location || null,
    language_note: service.language_note || null,
    recurrence: service.recurrence || null,
    seasonal: service.seasonal || null,
    data: null
  };
}

// ── Build event row ──
function buildEventRow(event, churchIdMap) {
  // Map parish_id + location_id to church_id
  var churchId = null;
  if (event.location_id && churchIdMap[event.location_id]) {
    churchId = event.location_id; // location_id IS the church_id
  } else if (event.parish_id && churchIdMap[event.parish_id]) {
    churchId = churchIdMap[event.parish_id]; // map from parish_id to primary church
  }
  return {
    id: event.id,
    church_id: churchId,
    category: event.category || 'community',
    title: event.title,
    type: event.type || null,
    description: event.description || null,
    date: event.date || null,
    dates: event.dates || null,
    day: event.day || null,
    time: event.time || null,
    end_time: event.end_time || null,
    end_date: event.end_date || null,
    venue_name: event.venue_name || null,
    venue_address: event.venue_address || null,
    venue_lat: event.venue_lat || null,
    venue_lng: event.venue_lng || null,
    contact_name: event.contact_name || null,
    contact_email: event.contact_email || null,
    contact_phone: event.contact_phone || null,
    image_url: event.image_url || null,
    flyer_url: event.flyer_url || null,
    registration_url: event.registration_url || null,
    tags: event.tags || null,
    notes: event.notes || null,
    social: event.social || false,
    service_id: event.service_id || null,
    data: null,
    status: 'active'
  };
}

async function main() {
  loadEnv();

  var supabaseUrl = process.env.SUPABASE_URL;
  var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  var supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // ── Load JSON files ──
  var repoRoot = path.join(__dirname, '..');
  var parishData = JSON.parse(fs.readFileSync(path.join(repoRoot, 'parish_data.json'), 'utf8'));
  var eventsFile = JSON.parse(fs.readFileSync(path.join(repoRoot, 'events.json'), 'utf8'));

  var parishes = parishData.parishes || [];
  var ycEvents = parishData.yc_events || [];
  var events = eventsFile.events || [];

  console.log('Loaded:', parishes.length, 'parishes,', ycEvents.length, 'YC events,', events.length, 'standalone events');

  // ── Transform parishes → churches + services ──
  var churchRows = [];
  var serviceRows = [];
  var parishToChurchMap = {}; // parish_id → primary church_id (for event mapping + favorites)
  var locationToChurchMap = {}; // location_id → church_id (always 1:1)

  for (var i = 0; i < parishes.length; i++) {
    var p = parishes[i];
    var locs = p.locations || [];

    // Filter to worship locations only (churches, chapels, shrines, etc.)
    var worshipLocs = locs.filter(isWorshipLocation);
    var nonWorshipLocs = locs.filter(function(l) { return !isWorshipLocation(l); });

    // Determine bulletin_group: multi-worship-location parishes share a bulletin
    var bulletinGroup = worshipLocs.length > 1 ? p.id : null;

    // Determine primary location for assigning orphan services
    var primaryLocId = getPrimaryLocationId(p);

    if (worshipLocs.length === 0) {
      // No worship locations — create a synthetic church from parish data
      console.warn('  WARN: Parish', p.id, 'has no worship locations — creating synthetic church');
      var syntheticId = p.id.replace('parish_', 'church-') + '-' + (p.town || 'unknown').toLowerCase().replace(/\s+/g, '-');
      var syntheticLoc = {
        id: syntheticId,
        name: p.name,
        type: 'church',
        city: p.town,
        state: p.state,
        lat: null,
        lng: null
      };
      churchRows.push(buildChurchRow(p, syntheticLoc, null));
      parishToChurchMap[p.id] = syntheticId;
      locationToChurchMap[syntheticId] = syntheticId;
      // Map non-worship location IDs to this synthetic church too
      nonWorshipLocs.forEach(function(l) { locationToChurchMap[l.id] = syntheticId; });

      // All services go to this synthetic church
      (p.services || []).forEach(function(s) {
        serviceRows.push(buildServiceRow(s, syntheticId));
      });
      continue;
    }

    // Set primary church for this parish
    parishToChurchMap[p.id] = primaryLocId;

    // Create one church per WORSHIP location only
    for (var j = 0; j < worshipLocs.length; j++) {
      var loc = worshipLocs[j];
      churchRows.push(buildChurchRow(p, loc, bulletinGroup));
      locationToChurchMap[loc.id] = loc.id;
    }

    // Map non-worship location IDs to the primary worship location
    // (so services at offices/halls get assigned to the main church)
    for (var j = 0; j < nonWorshipLocs.length; j++) {
      locationToChurchMap[nonWorshipLocs[j].id] = primaryLocId;
      if (nonWorshipLocs[j].id !== primaryLocId) {
        console.log('  Redirecting non-worship location', nonWorshipLocs[j].id, '(' + (nonWorshipLocs[j].name || 'unnamed') + ') →', primaryLocId);
      }
    }

    // Assign services to churches
    (p.services || []).forEach(function(s) {
      var churchId;
      if (s.location_id && locationToChurchMap[s.location_id]) {
        churchId = locationToChurchMap[s.location_id];
      } else {
        // No location_id — assign to primary location
        churchId = primaryLocId;
      }
      serviceRows.push(buildServiceRow(s, churchId));
    });
  }

  // Deduplicate services by ID (keep last occurrence)
  var seenSvc = {};
  var dedupedServices = [];
  for (var i = 0; i < serviceRows.length; i++) {
    seenSvc[serviceRows[i].id] = i;
  }
  for (var i = 0; i < serviceRows.length; i++) {
    if (seenSvc[serviceRows[i].id] === i) {
      dedupedServices.push(serviceRows[i]);
    }
  }
  if (dedupedServices.length !== serviceRows.length) {
    console.log('  Deduplicated services:', serviceRows.length, '→', dedupedServices.length);
  }
  serviceRows = dedupedServices;

  // Deduplicate churches by ID (shared locations like st-christopher-church-brimfield)
  var seenChurch = {};
  var dedupedChurches = [];
  for (var i = 0; i < churchRows.length; i++) {
    if (!seenChurch[churchRows[i].id]) {
      seenChurch[churchRows[i].id] = true;
      dedupedChurches.push(churchRows[i]);
    }
  }
  if (dedupedChurches.length !== churchRows.length) {
    console.log('  Deduplicated churches:', churchRows.length, '→', dedupedChurches.length);
  }
  churchRows = dedupedChurches;

  console.log('\nTransformed:', churchRows.length, 'churches,', serviceRows.length, 'services');

  // ── Clean up: delete existing rows then re-insert ──
  // This ensures stale non-worship locations are removed
  console.log('\n--- Clearing existing data ---');
  var delEvents = await supabase.from('events').delete().neq('id', '');
  if (delEvents.error) console.warn('  events delete:', delEvents.error.message);
  else console.log('  Cleared events');

  var delServices = await supabase.from('services').delete().neq('id', '');
  if (delServices.error) console.warn('  services delete:', delServices.error.message);
  else console.log('  Cleared services');

  var delChurches = await supabase.from('churches').delete().neq('id', '');
  if (delChurches.error) console.warn('  churches delete:', delChurches.error.message);
  else console.log('  Cleared churches');

  // ── Upsert churches ──
  console.log('\n--- Upserting churches ---');
  var BATCH = 50;
  var count = 0;
  for (var i = 0; i < churchRows.length; i += BATCH) {
    var batch = churchRows.slice(i, i + BATCH);
    var result = await supabase.from('churches').upsert(batch, { onConflict: 'id' });
    if (result.error) {
      console.error('Church upsert failed at batch', i, ':', result.error.message);
      console.error('First row in batch:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    count += batch.length;
    console.log('  Churches:', count, '/', churchRows.length);
  }

  // ── Upsert services ──
  console.log('\n--- Upserting services ---');
  count = 0;
  for (var i = 0; i < serviceRows.length; i += BATCH) {
    var batch = serviceRows.slice(i, i + BATCH);
    var result = await supabase.from('services').upsert(batch, { onConflict: 'id' });
    if (result.error) {
      console.error('Service upsert failed at batch', i, ':', result.error.message);
      console.error('First row in batch:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    count += batch.length;
    console.log('  Services:', count, '/', serviceRows.length);
  }

  // ── Upsert events ──
  console.log('\n--- Upserting events ---');
  var allEvents = events.concat(ycEvents.map(function(e) {
    return Object.assign({}, e, { category: e.category || 'yc' });
  }));

  // Build church ID map for event mapping
  var eventChurchMap = Object.assign({}, locationToChurchMap, parishToChurchMap);

  var eventRows = allEvents.map(function(e) {
    return buildEventRow(e, eventChurchMap);
  });

  // Deduplicate by ID (events.json YC events override parish_data.json yc_events)
  var seen = {};
  var dedupedEvents = [];
  for (var i = eventRows.length - 1; i >= 0; i--) {
    if (!seen[eventRows[i].id]) {
      seen[eventRows[i].id] = true;
      dedupedEvents.unshift(eventRows[i]);
    }
  }

  count = 0;
  for (var i = 0; i < dedupedEvents.length; i += BATCH) {
    var batch = dedupedEvents.slice(i, i + BATCH);
    var result = await supabase.from('events').upsert(batch, { onConflict: 'id' });
    if (result.error) {
      console.error('Event upsert failed at batch', i, ':', result.error.message);
      console.error('First row:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    count += batch.length;
    console.log('  Events:', count, '/', dedupedEvents.length);
  }

  // ── Upsert metadata ──
  console.log('\n--- Upserting metadata ---');
  var metaRows = [
    { key: 'parish_data_metadata', data: parishData.metadata || {} },
    { key: 'events_metadata', data: eventsFile.metadata || {} },
    { key: 'migration_info', data: {
      migrated_at: new Date().toISOString(),
      source: 'scripts/migrate-to-supabase.js',
      parish_to_church_map: parishToChurchMap
    }}
  ];
  var result = await supabase.from('metadata').upsert(metaRows, { onConflict: 'key' });
  if (result.error) {
    console.error('Metadata upsert failed:', result.error.message);
    process.exit(1);
  }
  console.log('  Metadata: 3 rows upserted');

  // ── Write parish→church mapping for frontend favorites migration ──
  var mappingPath = path.join(repoRoot, 'parish_to_church_map.json');
  fs.writeFileSync(mappingPath, JSON.stringify(parishToChurchMap, null, 2));
  console.log('\nWrote parish→church mapping to', mappingPath);

  // ── Verification ──
  console.log('\n--- Verification ---');
  var cResult = await supabase.from('churches').select('*', { count: 'exact', head: true });
  var sResult = await supabase.from('services').select('*', { count: 'exact', head: true });
  var eResult = await supabase.from('events').select('*', { count: 'exact', head: true });
  var mResult = await supabase.from('metadata').select('*', { count: 'exact', head: true });

  console.log('  churches:', cResult.count, '(expected:', churchRows.length, ')');
  console.log('  services:', sResult.count, '(expected:', serviceRows.length, ')');
  console.log('  events:  ', eResult.count, '(expected:', dedupedEvents.length, ')');
  console.log('  metadata:', mResult.count, '(expected: 3)');

  var allMatch = cResult.count === churchRows.length &&
                 sResult.count === serviceRows.length &&
                 eResult.count === dedupedEvents.length;

  if (allMatch) {
    console.log('\n  ALL COUNTS MATCH. Migration successful.');
  } else {
    console.log('\n  WARNING: Count mismatch. Check for duplicates or errors.');
  }
}

main().catch(function(err) {
  console.error('Migration failed:', err);
  process.exit(1);
});
