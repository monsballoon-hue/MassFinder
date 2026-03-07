// load-services.js — Load known services for a church from parish_data.json
// Returns numbered service list formatted for the change-detection prompt

var fs = require('fs');
var path = require('path');

var PARISH_DATA_PATH = path.resolve(__dirname, '../../parish_data.json');
var CHURCH_MAP_PATH = path.resolve(__dirname, '../../parish_to_church_map.json');

var _parishDataCache = null;
var _churchToParishMap = null;

/**
 * Load and cache parish_data.json.
 */
function loadParishData() {
  if (!_parishDataCache) {
    _parishDataCache = JSON.parse(fs.readFileSync(PARISH_DATA_PATH, 'utf8'));
  }
  return _parishDataCache;
}

/**
 * Build reverse map: church_id -> parish_id.
 */
function getChurchToParishMap() {
  if (!_churchToParishMap) {
    _churchToParishMap = {};
    try {
      var mapData = JSON.parse(fs.readFileSync(CHURCH_MAP_PATH, 'utf8'));
      Object.keys(mapData).forEach(function(parishId) {
        var churchId = mapData[parishId];
        _churchToParishMap[churchId] = parishId;
      });
    } catch (e) {
      console.log('WARNING: Could not load parish_to_church_map.json: ' + e.message);
    }
  }
  return _churchToParishMap;
}

/**
 * Load known services for a specific church, formatted for the change-detection prompt.
 *
 * @param {string} churchId - e.g., "st-mary-s-church-longmeadow"
 * @returns {object|null} { parishId, parishName, services: [{num, id, type, day, time, ...}], clergy, locationName }
 */
function getChurchContext(churchId) {
  var pd = loadParishData();
  var map = getChurchToParishMap();

  var parishId = map[churchId];
  if (!parishId) return null;

  // Find parish
  var parish = null;
  for (var i = 0; i < pd.parishes.length; i++) {
    if (pd.parishes[i].id === parishId) {
      parish = pd.parishes[i];
      break;
    }
  }
  if (!parish) return null;

  // Find location name for this church
  var locationName = churchId;
  var locationCity = '';
  if (parish.locations) {
    for (var j = 0; j < parish.locations.length; j++) {
      if (parish.locations[j].id === churchId) {
        locationName = parish.locations[j].name;
        locationCity = parish.locations[j].city || '';
        break;
      }
    }
  }

  // Filter services to this church's location (or location-agnostic)
  var allServices = parish.services || [];
  var filtered = allServices.filter(function(svc) {
    // Include if no location_id (parish-wide) or matches this church
    if (!svc.location_id) return true;
    return svc.location_id === churchId;
  });

  // Exclude anointing_of_sick only if it has no scheduled time
  filtered = filtered.filter(function(svc) {
    if (svc.type === 'anointing_of_sick' && !svc.time) return false;
    return true;
  });

  // Number services sequentially
  var numbered = filtered.map(function(svc, idx) {
    return {
      num: idx + 1,
      id: svc.id,
      type: svc.type,
      day: svc.day || null,
      time: svc.time || null,
      end_time: svc.end_time || null,
      language: svc.language || 'en',
      notes: svc.notes || null,
      seasonal: svc.seasonal || null,
      recurrence: svc.recurrence || null,
      location_id: svc.location_id || null
    };
  });

  return {
    parishId: parish.id,
    parishName: parish.name,
    locationName: locationName,
    locationCity: locationCity,
    services: numbered,
    clergy: parish.clergy || []
  };
}

/**
 * Format services as a compact table for the prompt.
 * ~25 tokens per service line.
 *
 * @param {Array} services - numbered service objects from getChurchContext
 * @returns {string}
 */
function formatServicesForPrompt(services) {
  return services.map(function(svc) {
    var parts = [
      svc.num + '.',
      svc.type,
      '|', svc.day || 'N/A',
      '|', svc.time || 'varies'
    ];
    if (svc.end_time) parts.push('-' + svc.end_time);
    if (svc.language && svc.language !== 'en') parts.push('[' + svc.language + ']');

    var seasonal = svc.seasonal;
    if (seasonal && seasonal.is_seasonal) {
      parts.push('{' + seasonal.season + '}');
    }

    if (svc.notes) {
      // Truncate long notes
      var note = svc.notes.length > 40 ? svc.notes.substring(0, 37) + '...' : svc.notes;
      parts.push('(' + note + ')');
    }

    return parts.join(' ');
  }).join('\n');
}

/**
 * Auto-derive church classification from parish_data.json.
 * Returns multi-church context if parish has 2+ church locations.
 *
 * @param {string} churchId
 * @returns {object|null} { isMultiChurch, target_location, sibling_locations } or null
 */
function getChurchClassification(churchId) {
  var pd = loadParishData();
  var map = getChurchToParishMap();
  var parishId = map[churchId];
  if (!parishId) return null;

  var parish = null;
  for (var i = 0; i < pd.parishes.length; i++) {
    if (pd.parishes[i].id === parishId) { parish = pd.parishes[i]; break; }
  }
  if (!parish || !parish.locations) return null;

  // Count all worship locations (churches + chapels)
  var worshipSites = parish.locations.filter(function(l) {
    return l.type === 'church' || l.type === 'chapel';
  });

  if (worshipSites.length <= 1) {
    return { isMultiChurch: false };
  }

  // Find this church's short name and build sibling list
  var target = null;
  var siblings = [];
  worshipSites.forEach(function(loc) {
    var label = loc.short_name || loc.name;
    if (loc.id === churchId) {
      target = label;
    } else {
      siblings.push(label);
    }
  });

  return {
    isMultiChurch: true,
    target_location: target,
    sibling_locations: siblings
  };
}

module.exports = {
  getChurchContext: getChurchContext,
  getChurchClassification: getChurchClassification,
  formatServicesForPrompt: formatServicesForPrompt,
  loadParishData: loadParishData
};
