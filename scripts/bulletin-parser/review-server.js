#!/usr/bin/env node
// review-server.js — Local web server for visual bulletin review
// Usage: node scripts/bulletin-parser/review-server.js

var http = require('http');
var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');
var config = require('./config');
var sb = require('@supabase/supabase-js');

var supabase = sb.createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// ── Validation enums (must match DATA_STANDARDS.md + schema) ──
var VALID_ITEM_TYPES = ['service', 'event', 'notice'];
var VALID_SERVICE_CATS = ['mass','confession','adoration','perpetual_adoration','rosary','stations_of_cross','novena','holy_hour','divine_mercy','miraculous_medal','anointing_of_sick','communion_service','prayer_group','benediction','vespers','devotion','blessing','gorzkie_zale','holy_thursday_mass','good_friday_service','easter_vigil_mass','palm_sunday_mass','easter_sunday_mass'];
var VALID_EVENT_CATS = ['fish_fry','pancake_breakfast','potluck','dinner_dance','trivia_night','movie_night','game_night','picnic','festival','bible_study','book_club','speaker_series','retreat','mission','adult_education','youth_group','choir','senior_group','fraternal','performance','concert'];
var VALID_NOTICE_CATS = ['weather_closure','schedule_change','office_hours_change'];
var VALID_CATEGORIES = VALID_SERVICE_CATS.concat(VALID_EVENT_CATS).concat(VALID_NOTICE_CATS).concat(['general']);
var VALID_RECURRING = [null, 'weekly', 'monthly', 'one_time'];
var VALID_SEASONAL = [null, 'year_round', 'lent', 'advent', 'holy_week', 'easter_season', 'academic_year', 'summer'];
var VALID_DAYS = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'weekday', 'daily', 'first_friday', 'first_saturday', 'holyday', 'holyday_eve',
  'good_friday', 'holy_thursday', 'holy_saturday', 'easter_vigil',
  'palm_sunday', 'easter_sunday', 'civil_holiday'];
var VALID_LANGUAGES = [null, 'en', 'es', 'pl', 'pt', 'fr', 'la', 'vi'];
var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateItemUpdate(data) {
  var errors = [];
  if (data.item_type !== undefined && VALID_ITEM_TYPES.indexOf(data.item_type) < 0) {
    errors.push('Invalid item_type: ' + data.item_type);
  }
  if (data.category !== undefined && VALID_CATEGORIES.indexOf(data.category) < 0) {
    errors.push('Invalid category: ' + data.category);
  }
  if (data.day !== undefined && VALID_DAYS.indexOf(data.day) < 0) {
    errors.push('Invalid day: ' + data.day);
  }
  if (data.recurring !== undefined && VALID_RECURRING.indexOf(data.recurring) < 0) {
    errors.push('Invalid recurring: ' + data.recurring);
  }
  if (data.seasonal !== undefined && VALID_SEASONAL.indexOf(data.seasonal) < 0) {
    errors.push('Invalid seasonal: ' + data.seasonal);
  }
  if (data.language !== undefined && data.language !== null) {
    // Support comma-separated bilingual values like "es,en"
    var langs = String(data.language).split(',');
    for (var li = 0; li < langs.length; li++) {
      if (VALID_LANGUAGES.indexOf(langs[li].trim()) < 0) {
        errors.push('Invalid language: ' + langs[li].trim());
      }
    }
  }
  if (data.event_time && !TIME_RE.test(data.event_time)) {
    errors.push('Invalid time format (expected HH:MM): ' + data.event_time);
  }
  if (data.end_time && !TIME_RE.test(data.end_time)) {
    errors.push('Invalid end_time format (expected HH:MM): ' + data.end_time);
  }
  if (data.event_date && !DATE_RE.test(data.event_date)) {
    errors.push('Invalid date format (expected YYYY-MM-DD): ' + data.event_date);
  }
  if (data.end_date && !DATE_RE.test(data.end_date)) {
    errors.push('Invalid end_date format (expected YYYY-MM-DD): ' + data.end_date);
  }
  return errors;
}

var PORT = 3456;
var MANUAL_DIR = path.resolve(__dirname, '../../bulletins-manual');
var IMG_CACHE_DIR = path.resolve(__dirname, '../../.tmp-review-images');

if (!fs.existsSync(IMG_CACHE_DIR)) fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });

var server = http.createServer(function(req, res) {
  var parts = req.url.split('?');
  var urlPath = parts[0];

  // Serve the UI
  if (urlPath === '/' || urlPath === '/index.html') {
    var htmlPath = path.join(__dirname, 'review-ui.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(htmlPath, 'utf8'));
    return;
  }

  // V2 review UI
  if (urlPath === '/v2' || urlPath === '/v2/') {
    var v2Path = path.join(__dirname, 'review-v2.html');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(v2Path, 'utf8'));
    return;
  }

  // V2 API: list v2 bulletins with change summaries
  if (urlPath === '/api/v2/bulletins') {
    getV2Bulletins().then(function(data) {
      jsonResp(res, 200, data);
    }).catch(function(err) {
      jsonResp(res, 500, { error: err.message });
    });
    return;
  }

  // V2 API: get changes for a specific bulletin
  if (urlPath === '/api/v2/changes') {
    var query = parseQuery(parts[1] || '');
    var bulletinId = query.bulletin_id;
    if (!bulletinId) return jsonResp(res, 400, { error: 'bulletin_id required' });
    getV2Changes(parseInt(bulletinId)).then(function(data) {
      jsonResp(res, 200, data);
    }).catch(function(err) {
      jsonResp(res, 500, { error: err.message });
    });
    return;
  }

  // V2 API: get known services for a church
  if (urlPath === '/api/v2/services') {
    var query = parseQuery(parts[1] || '');
    var svcChurchId = query.church_id;
    if (!svcChurchId) return jsonResp(res, 400, { error: 'church_id required' });
    var loader = require('./load-services');
    var ctx = loader.getChurchContext(svcChurchId);
    if (!ctx) return jsonResp(res, 404, { error: 'Church not found: ' + svcChurchId });
    jsonResp(res, 200, {
      parishName: ctx.parishName,
      locationName: ctx.locationName,
      services: ctx.services,
      clergy: ctx.clergy
    });
    return;
  }

  // V2 API: update a change item (approve/reject/edit)
  if (urlPath === '/api/v2/update-change' && req.method === 'POST') {
    readBody(req, function(data) {
      var id = data.id;
      if (!id) return jsonResp(res, 400, { error: 'id required' });
      var updates = {};
      if (data.status) updates.status = data.status;
      if (data.title !== undefined) updates.title = data.title;
      if (data.description !== undefined) updates.description = data.description;
      if (data.event_date !== undefined) updates.event_date = data.event_date;
      if (data.event_time !== undefined) updates.event_time = data.event_time;
      if (data.event_end_time !== undefined) updates.event_end_time = data.event_end_time;
      if (data.category !== undefined) updates.category = data.category;
      if (data.notes !== undefined) updates.notes = data.notes;
      if (data.service_type !== undefined) updates.service_type = data.service_type;
      if (data.day !== undefined) updates.day = data.day;
      if (data.time !== undefined) updates.time = data.time;
      if (data.end_time !== undefined) updates.end_time = data.end_time;
      if (data.language !== undefined) updates.language = data.language;
      if (data.seasonal !== undefined) updates.seasonal = data.seasonal;
      if (data.new_value !== undefined) updates.new_value = data.new_value;
      if (data.location !== undefined) updates.location = data.location;
      if (data.effective_date !== undefined) updates.effective_date = data.effective_date;
      if (data.confidence !== undefined) updates.confidence = data.confidence;
      supabase.from('bulletin_changes').update(updates)
        .eq('id', id).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true });
        });
    });
    return;
  }

  // V2 API: bulk approve/reject changes
  if (urlPath === '/api/v2/bulk-update' && req.method === 'POST') {
    readBody(req, function(data) {
      supabase.from('bulletin_changes').update({ status: data.status })
        .in('id', data.ids).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true, count: data.ids.length });
        });
    });
    return;
  }

  // API: list bulletins with items + church info
  if (urlPath === '/api/bulletins') {
    getBulletins().then(function(data) {
      jsonResp(res, 200, data);
    }).catch(function(err) {
      jsonResp(res, 500, { error: err.message });
    });
    return;
  }

  // API: update single item (status + optional field edits)
  if (urlPath === '/api/update-item' && req.method === 'POST') {
    readBody(req, function(data) {
      var id = data.id;
      if (!id) return jsonResp(res, 400, { error: 'id is required' });

      // Validate enum fields before writing
      var valErrors = validateItemUpdate(data);
      if (valErrors.length > 0) {
        return jsonResp(res, 400, { error: valErrors.join('; ') });
      }

      var updates = {};
      // Always include status if provided
      if (data.status) updates.status = data.status;
      // Allow editing any bulletin_items field
      var editableFields = [
        'title', 'category', 'item_type', 'description', 'original_text',
        'day', 'event_date', 'event_time', 'end_time', 'end_date', 'location',
        'contact_name', 'contact_phone', 'contact_email', 'registration_url',
        'recurring', 'seasonal', 'language', 'host_parish', 'confidence'
      ];
      editableFields.forEach(function(f) {
        if (data[f] !== undefined) updates[f] = data[f];
      });
      if (data.tags !== undefined) updates.tags = data.tags;
      supabase.from('bulletin_items').update(updates)
        .eq('id', id).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true });
        });
    });
    return;
  }

  // API: bulk update items
  if (urlPath === '/api/bulk-update' && req.method === 'POST') {
    readBody(req, function(data) {
      supabase.from('bulletin_items').update({ status: data.status })
        .in('id', data.ids).then(function(r) {
          if (r.error) return jsonResp(res, 500, { error: r.error.message });
          jsonResp(res, 200, { ok: true, count: data.ids.length });
        });
    });
    return;
  }

  // API: get existing parish data for diff comparison
  if (urlPath === '/api/existing-data') {
    var query = parseQuery(parts[1] || '');
    var churchId = query.church_id;
    if (!churchId) return jsonResp(res, 400, { error: 'church_id required' });
    getExistingData(churchId).then(function(data) {
      jsonResp(res, 200, data);
    }).catch(function(err) {
      jsonResp(res, 500, { error: err.message });
    });
    return;
  }

  // Serve page images: /images/{church-id}/page_1.png
  if (urlPath.indexOf('/images/') === 0) {
    var imgParts = urlPath.replace('/images/', '').split('/');
    var churchId = imgParts[0];
    var filename = imgParts[1];
    var imgPath = path.join(IMG_CACHE_DIR, churchId, filename);

    if (fs.existsSync(imgPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
      res.end(fs.readFileSync(imgPath));
    } else {
      generateImages(churchId).then(function() {
        if (fs.existsSync(imgPath)) {
          res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
          res.end(fs.readFileSync(imgPath));
        } else {
          res.writeHead(404); res.end('Not found');
        }
      }).catch(function() { res.writeHead(404); res.end('Not found'); });
    }
    return;
  }

  res.writeHead(404); res.end('Not found');
});

function parseQuery(qs) {
  var result = {};
  if (!qs) return result;
  qs.split('&').forEach(function(pair) {
    var parts = pair.split('=');
    if (parts.length === 2) result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  });
  return result;
}

// Load existing services/events from parish_data.json and events.json for diff
var parishDataPath = path.resolve(__dirname, '../../parish_data.json');
var eventsDataPath = path.resolve(__dirname, '../../events.json');
var parishDataCache = null;
var eventsDataCache = null;

// Map from Supabase church IDs to parish_data.json parish IDs
var churchMapPath = path.resolve(__dirname, '../../parish_to_church_map.json');
var churchToParishMap = {};
try {
  var mapData = JSON.parse(fs.readFileSync(churchMapPath, 'utf8'));
  // Reverse: we need church_id -> parish_id
  Object.keys(mapData).forEach(function(parishId) {
    var churchId = mapData[parishId];
    if (!churchToParishMap[churchId]) churchToParishMap[churchId] = [];
    churchToParishMap[churchId].push(parishId);
  });
} catch(e) { console.log('Note: parish_to_church_map.json not found, diff will use name matching'); }

function loadParishData() {
  if (!parishDataCache) {
    try { parishDataCache = JSON.parse(fs.readFileSync(parishDataPath, 'utf8')); } catch(e) { parishDataCache = { parishes: [] }; }
  }
  return parishDataCache;
}

function loadEventsData() {
  if (!eventsDataCache) {
    try { eventsDataCache = JSON.parse(fs.readFileSync(eventsDataPath, 'utf8')); } catch(e) { eventsDataCache = { events: [] }; }
  }
  return eventsDataCache;
}

function getExistingData(churchId) {
  var pd = loadParishData();
  var ev = loadEventsData();

  // Find parish by church map or name matching
  var parishIds = churchToParishMap[churchId] || [];
  var parish = null;
  for (var i = 0; i < pd.parishes.length; i++) {
    if (parishIds.indexOf(pd.parishes[i].id) >= 0) {
      parish = pd.parishes[i];
      break;
    }
  }

  // Fallback: match by name similarity using church name from Supabase
  if (!parish) {
    return supabase.from('churches').select('name, city').eq('id', churchId).single()
      .then(function(r) {
        var church = r.data || {};
        var churchName = (church.name || '').toLowerCase();
        for (var j = 0; j < pd.parishes.length; j++) {
          if (pd.parishes[j].name.toLowerCase().indexOf(churchName) >= 0 ||
              churchName.indexOf(pd.parishes[j].name.toLowerCase()) >= 0) {
            parish = pd.parishes[j];
            break;
          }
        }
        return buildExistingResult(parish, churchId, ev);
      });
  }

  return Promise.resolve(buildExistingResult(parish, churchId, ev));
}

function buildExistingResult(parish, churchId, ev) {
  var services = [];
  var clergy = [];
  var events = [];

  if (parish) {
    services = (parish.services || []).map(function(s) {
      return {
        id: s.id,
        type: s.type,
        day: s.day,
        time: s.time,
        end_time: s.end_time,
        location_id: s.location_id,
        language: s.language,
        notes: s.notes,
        seasonal: s.seasonal,
        recurrence: s.recurrence
      };
    });
    clergy = parish.clergy || [];

    // Find events for this parish
    events = (ev.events || []).filter(function(e) {
      return e.parish_id === parish.id;
    }).map(function(e) {
      return {
        id: e.id,
        category: e.category,
        title: e.title,
        date: e.date,
        dates: e.dates,
        day: e.day,
        time: e.time,
        end_time: e.end_time,
        description: e.description,
        location_id: e.location_id,
        tags: e.tags
      };
    });
  }

  return {
    parishId: parish ? parish.id : null,
    parishName: parish ? parish.name : null,
    services: services,
    clergy: clergy,
    events: events
  };
}

function jsonResp(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req, cb) {
  var body = '';
  req.on('data', function(c) { body += c; });
  req.on('end', function() { cb(JSON.parse(body)); });
}

function getBulletins() {
  return supabase.from('bulletins')
    .select('id, church_id, bulletin_date, page_count, status, parse_cost_usd, raw_extraction')
    .order('church_id')
    .then(function(bRes) {
      if (bRes.error) throw new Error(bRes.error.message);
      var bulletins = bRes.data || [];
      return supabase.from('bulletin_items')
        .select('*')
        .order('source_page')
        .then(function(iRes) {
          if (iRes.error) throw new Error(iRes.error.message);
          var items = iRes.data || [];
          var churchIds = bulletins.map(function(b) { return b.church_id; });
          return supabase.from('churches').select('id, name, city')
            .in('id', churchIds).then(function(cRes) {
              var churches = {};
              (cRes.data || []).forEach(function(c) { churches[c.id] = c; });
              var itemsByBulletin = {};
              items.forEach(function(item) {
                if (!itemsByBulletin[item.bulletin_id]) itemsByBulletin[item.bulletin_id] = [];
                itemsByBulletin[item.bulletin_id].push(item);
              });
              return bulletins.map(function(b) {
                var church = churches[b.church_id] || {};
                var raw = b.raw_extraction || {};
                return {
                  id: b.id, churchId: b.church_id,
                  churchName: church.name || b.church_id,
                  churchCity: church.city || '',
                  bulletinDate: b.bulletin_date,
                  pageCount: b.page_count,
                  cost: b.parse_cost_usd,
                  items: itemsByBulletin[b.id] || [],
                  massSchedule: raw.massSchedule || [],
                  clergy: raw.clergy || [],
                };
              });
            });
        });
    });
}

function generateImages(churchId) {
  var outDir = path.join(IMG_CACHE_DIR, churchId);
  if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) return Promise.resolve();
  var pdfPath = path.join(MANUAL_DIR, churchId + '.pdf');
  if (!fs.existsSync(pdfPath)) return Promise.reject(new Error('No PDF'));
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  var outPattern = path.join(outDir, 'page_%d.png');
  var args = ['-dNOPAUSE', '-dBATCH', '-dSAFER', '-sDEVICE=png16m', '-r150',
    '-dFirstPage=1', '-dLastPage=12', '-sOutputFile=' + outPattern, pdfPath];
  return new Promise(function(resolve, reject) {
    var proc = childProcess.spawn('gs', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    proc.on('close', function(code) { code === 0 ? resolve() : reject(new Error('gs failed')); });
    proc.on('error', reject);
  });
}

// Pre-generate all images on startup
function pregenerate() {
  var pdfs = [];
  try { pdfs = fs.readdirSync(MANUAL_DIR).filter(function(f) { return f.endsWith('.pdf'); }); } catch(e) {}
  if (pdfs.length === 0) return;
  console.log('Pre-generating page images for ' + pdfs.length + ' bulletins...');
  var i = 0;
  function next() {
    if (i >= pdfs.length) { console.log('All images ready.\n'); return; }
    var cid = pdfs[i].replace('.pdf', '');
    i++;
    process.stdout.write('  ' + cid + '...');
    generateImages(cid).then(function() { console.log(' done'); next(); })
      .catch(function(e) { console.log(' skip (' + e.message + ')'); next(); });
  }
  next();
}

// ── V2 data functions ──

function getV2Bulletins() {
  return supabase.from('bulletins')
    .select('id, church_id, bulletin_date, page_count, status, parse_cost_usd, pipeline_version, text_quality, services_confirmed, services_total')
    .eq('pipeline_version', 2)
    .order('bulletin_date', { ascending: false })
    .then(function(bRes) {
      if (bRes.error) throw new Error(bRes.error.message);
      var bulletins = bRes.data || [];
      var bulletinIds = bulletins.map(function(b) { return b.id; });
      if (bulletinIds.length === 0) return [];

      // Get change counts per bulletin
      return supabase.from('bulletin_changes')
        .select('bulletin_id, change_type, status')
        .in('bulletin_id', bulletinIds)
        .then(function(cRes) {
          if (cRes.error) throw new Error(cRes.error.message);
          var changes = cRes.data || [];

          // Get church names
          var churchIds = bulletins.map(function(b) { return b.church_id; });
          return supabase.from('churches').select('id, name, city')
            .in('id', churchIds).then(function(chRes) {
              var churches = {};
              (chRes.data || []).forEach(function(c) { churches[c.id] = c; });

              // Aggregate change counts per bulletin
              var changeCounts = {};
              changes.forEach(function(ch) {
                var key = ch.bulletin_id;
                if (!changeCounts[key]) changeCounts[key] = { confirmed: 0, modified: 0, not_found: 0, new_service: 0, event: 0, notice: 0, pending: 0 };
                changeCounts[key][ch.change_type] = (changeCounts[key][ch.change_type] || 0) + 1;
                if (ch.status === 'pending') changeCounts[key].pending++;
              });

              return bulletins.map(function(b) {
                var church = churches[b.church_id] || {};
                var counts = changeCounts[b.id] || {};
                return {
                  id: b.id,
                  churchId: b.church_id,
                  churchName: church.name || b.church_id,
                  churchCity: church.city || '',
                  bulletinDate: b.bulletin_date,
                  textQuality: b.text_quality,
                  confirmed: counts.confirmed || 0,
                  modified: counts.modified || 0,
                  notFound: counts.not_found || 0,
                  newServices: counts.new_service || 0,
                  events: counts.event || 0,
                  notices: counts.notice || 0,
                  pending: counts.pending || 0,
                  servicesConfirmed: b.services_confirmed,
                  servicesTotal: b.services_total,
                  cost: b.parse_cost_usd,
                  pageCount: b.page_count || 0,
                };
              });
            });
        });
    });
}

function getV2Changes(bulletinId) {
  return supabase.from('bulletin_changes')
    .select('*')
    .eq('bulletin_id', bulletinId)
    .order('change_type')
    .then(function(res) {
      if (res.error) throw new Error(res.error.message);
      return res.data || [];
    });
}

server.listen(PORT, function() {
  console.log('\n  Bulletin Review UI');
  console.log('  V1: http://localhost:' + PORT + '/');
  console.log('  V2: http://localhost:' + PORT + '/v2/');
  console.log('');
  pregenerate();
});
