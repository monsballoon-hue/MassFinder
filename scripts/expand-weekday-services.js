#!/usr/bin/env node
/**
 * Migration: Expand "weekday" and "daily" day values into individual day entries.
 *
 * weekday → monday, tuesday, wednesday, thursday, friday (5 entries)
 * daily   → monday, tuesday, wednesday, thursday, friday, saturday, sunday (7 entries)
 *
 * Skips expansion for a specific day if a matching entry already exists
 * (same type + day + time + location_id) to avoid duplicates.
 *
 * Usage:
 *   node scripts/expand-weekday-services.js          # dry run (prints changes)
 *   node scripts/expand-weekday-services.js --write   # writes parish_data.json
 */

var fs = require('fs');
var path = require('path');

var WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
var ALL_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
var DAY_ABBR = {
  monday: 'mon', tuesday: 'tue', wednesday: 'wed',
  thursday: 'thu', friday: 'fri', saturday: 'sat', sunday: 'sun'
};

var dryRun = process.argv.indexOf('--write') === -1;
var filePath = path.join(__dirname, '..', 'parish_data.json');
var raw = fs.readFileSync(filePath, 'utf8');
var data = JSON.parse(raw);

var stats = { expanded: 0, skippedDupes: 0, totalNew: 0, parishes: 0 };

data.parishes.forEach(function(parish) {
  var services = parish.services || [];
  var toRemove = [];
  var toAdd = [];

  services.forEach(function(svc, idx) {
    if (svc.day !== 'weekday' && svc.day !== 'daily') return;

    var days = svc.day === 'weekday' ? WEEKDAYS : ALL_DAYS;

    // Build a set of existing service fingerprints for dupe detection
    var existing = {};
    services.forEach(function(s) {
      if (s.day !== 'weekday' && s.day !== 'daily') {
        var key = s.type + '|' + s.day + '|' + (s.time || '') + '|' + (s.location_id || '');
        existing[key] = true;
      }
    });

    var addedForThis = 0;
    days.forEach(function(day) {
      var key = svc.type + '|' + day + '|' + (svc.time || '') + '|' + (svc.location_id || '');
      if (existing[key]) {
        stats.skippedDupes++;
        if (!dryRun) {
          // skip — already exists
        } else {
          console.log('  SKIP (dupe): ' + svc.id + ' → ' + day + ' (already exists)');
        }
        return;
      }

      // Generate new ID: replace 'wkday' or 'daily' or 'mf' with day abbreviation
      var newId;
      if (/wkday|daily/.test(svc.id)) {
        newId = svc.id.replace(/wkday|daily/, DAY_ABBR[day]);
      } else {
        // Fallback: insert day abbreviation before the time portion or append
        var timeMatch = svc.id.match(/(-\d{4})/);
        if (timeMatch) {
          newId = svc.id.replace(timeMatch[1], '-' + DAY_ABBR[day] + timeMatch[1]);
        } else {
          newId = svc.id + '-' + DAY_ABBR[day];
        }
      }

      // Deep clone the service
      var newSvc = JSON.parse(JSON.stringify(svc));
      newSvc.id = newId;
      newSvc.day = day;

      // Clean up notes that just say "Monday–Friday" or "Mon–Fri" (redundant now)
      if (newSvc.notes) {
        var cleaned = newSvc.notes
          .replace(/^Monday[–-]Friday$/i, '')
          .replace(/^Mon[–-]Fri$/i, '')
          .trim();
        if (cleaned === '') newSvc.notes = null;
        // Leave more complex notes untouched (e.g., "Before Daily Mass, Monday–Friday")
      }

      toAdd.push(newSvc);
      addedForThis++;
    });

    if (addedForThis > 0) {
      toRemove.push(idx);
      stats.expanded++;
      stats.totalNew += addedForThis;
    }
  });

  if (toRemove.length > 0) {
    stats.parishes++;

    if (dryRun) {
      console.log('\n' + parish.name + ' (parish ' + parish.id + '):');
      toRemove.forEach(function(idx) {
        var s = services[idx];
        console.log('  EXPAND: ' + s.id + ' (' + s.type + ' | ' + s.day + ' | ' + (s.time || 'no-time') + ')');
      });
      toAdd.forEach(function(s) {
        console.log('    + ' + s.id + ' | ' + s.day + ' | ' + (s.time || 'no-time'));
      });
    }

    // Remove originals (reverse order to preserve indices)
    toRemove.sort(function(a, b) { return b - a; });
    toRemove.forEach(function(idx) { services.splice(idx, 1); });

    // Add new entries
    toAdd.forEach(function(s) { services.push(s); });

    // Sort services by a stable order: type, then day order, then time
    var DAY_ORDER = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
      friday: 5, saturday: 6, first_friday: 7, first_saturday: 8,
      holyday: 9, holyday_eve: 10, holy_thursday: 11, good_friday: 12,
      holy_saturday: 13, easter_vigil: 14, palm_sunday: 15, easter_sunday: 16,
      civil_holiday: 17
    };
    var TYPE_ORDER = {
      sunday_mass: 0, daily_mass: 1, communion_service: 2,
      confession: 3, adoration: 4, perpetual_adoration: 5,
      holy_hour: 6, rosary: 7, divine_mercy: 8
    };
    services.sort(function(a, b) {
      var ta = TYPE_ORDER[a.type] != null ? TYPE_ORDER[a.type] : 50;
      var tb = TYPE_ORDER[b.type] != null ? TYPE_ORDER[b.type] : 50;
      if (ta !== tb) return ta - tb;
      var da = DAY_ORDER[a.day] != null ? DAY_ORDER[a.day] : 99;
      var db = DAY_ORDER[b.day] != null ? DAY_ORDER[b.day] : 99;
      if (da !== db) return da - db;
      return (a.time || '').localeCompare(b.time || '');
    });

    parish.services = services;
  }
});

// Update metadata
var totalServices = 0;
var typeCounts = {};
data.parishes.forEach(function(p) {
  (p.services || []).forEach(function(s) {
    totalServices++;
    typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
});
data.metadata.total_services = totalServices;
data.metadata.service_types_found = typeCounts;

console.log('\n--- SUMMARY ---');
console.log('Entries expanded:', stats.expanded);
console.log('New entries created:', stats.totalNew);
console.log('Duplicates skipped:', stats.skippedDupes);
console.log('Parishes affected:', stats.parishes);
console.log('Old total services:', 1420);
console.log('New total services:', totalServices);

if (dryRun) {
  console.log('\nDry run — no changes written. Use --write to apply.');
} else {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
  console.log('\nWritten to ' + filePath);
}
