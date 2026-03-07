// prompt-v2.js — Change detection prompt for bulletin parsing v2
// Two prompt strategies:
//   Single-church: simple, focused, no disambiguation needed
//   Multi-church: column-aware, strict attribution rules

var STANDARDS = require('./data-standards-compact');

/**
 * Build a change-detection prompt.
 * Automatically selects single-church or multi-church strategy based on profile.
 */
function buildChangePrompt(churchName, churchTown, services, bulletinText, profile) {
  var isMultiChurch = profile && profile.target_location;
  if (isMultiChurch) {
    return buildMultiChurchPrompt(churchName, churchTown, services, bulletinText, profile);
  }
  return buildSingleChurchPrompt(churchName, churchTown, services, bulletinText, profile);
}

// ── SINGLE-CHURCH PROMPT ──
// Clean and direct. No multi-church disambiguation needed.
function buildSingleChurchPrompt(churchName, churchTown, services, bulletinText, profile) {
  var loader = require('./load-services');
  var scheduleTable = loader.formatServicesForPrompt(services);
  var currentYear = new Date().getFullYear();

  var notes = '';
  if (profile && profile.parsing_notes) {
    notes = '\nNote: ' + profile.parsing_notes;
  }

  return 'You are verifying the weekly schedule for ' + churchName + ' in ' + churchTown + '.' +
    notes +
    '\n\n## CURRENT KNOWN SCHEDULE\n' +
    'These are the services we have on file. Each is numbered for reference.\n' +
    scheduleTable +
    '\n\n## THIS WEEK\'S BULLETIN TEXT\n' +
    bulletinText +
    '\n\n' + buildTaskSection(currentYear);
}

// ── MULTI-CHURCH PROMPT ──
// Strict attribution rules for cluster parishes with multiple worship sites.
function buildMultiChurchPrompt(churchName, churchTown, services, bulletinText, profile) {
  var loader = require('./load-services');
  var scheduleTable = loader.formatServicesForPrompt(services);
  var currentYear = new Date().getFullYear();

  var target = profile.target_location;
  var siblings = (profile.sibling_locations || []).join(', ');

  var context = '\nNote: ' + (profile.parsing_notes || '') +
    '\n\n## MULTI-CHURCH RULES (READ CAREFULLY)\n' +
    'This bulletin covers MULTIPLE worship sites under one parish.\n' +
    'You are ONLY verifying services for **' + target + '** (' + churchName + ').\n\n' +
    'Sibling locations to EXCLUDE: ' + siblings + '\n\n' +
    'This bulletin contains TWO types of schedule information:\n' +
    '1. **Parish-wide summary** — lists ALL services across ALL churches (e.g., "M-T-Th-F: 8:30am").\n' +
    '   This is a combined schedule. Do NOT assume everything in it belongs to ' + target + '.\n' +
    '2. **Church-specific breakdown** — lists each church separately with its own schedule\n' +
    '   (often in a two-column layout: ' + target + ' on the left, sibling on the right).\n' +
    '   THIS is your authoritative source for which services belong to ' + target + '.\n\n' +
    'ATTRIBUTION RULES:\n' +
    '- A service belongs to ' + target + ' ONLY if it appears under ' + target + '\'s section ' +
    'in the church-specific breakdown.\n' +
    '- If a service appears in the parish-wide summary but NOT under ' + target + '\'s section, ' +
    'it belongs to a sibling church — IGNORE it.\n' +
    '- If you cannot determine which church a service belongs to, IGNORE it.\n' +
    '- When the text has two church names on the same line separated by large whitespace, ' +
    'this is a TWO-COLUMN layout. Items on the LEFT go with the first church, items on the RIGHT ' +
    'go with the second church.\n' +
    '- NEVER report a new service for ' + target + ' unless you are confident it is specifically at ' + target + '.\n';

  return 'You are verifying the weekly schedule for ' + churchName + ' (' + target + ') in ' + churchTown + '.' +
    context +
    '\n## CURRENT KNOWN SCHEDULE (for ' + target + ' only)\n' +
    'These are the services we have on file. Each is numbered for reference.\n' +
    scheduleTable +
    '\n\n## THIS WEEK\'S BULLETIN TEXT\n' +
    bulletinText +
    '\n\n' + buildTaskSection(currentYear);
}

// ── SHARED TASK + OUTPUT FORMAT ──
function buildTaskSection(currentYear) {
  return '## YOUR TASK\n' +
    'Compare the bulletin text against the known schedule above. Report:\n\n' +
    '1. **confirmed** — Service numbers from the known schedule that appear in the bulletin unchanged.\n' +
    '   Just list the numbers (e.g., [1, 2, 3, 5, 7]).\n' +
    '   Seasonal services (marked with {lent}, {holy_week}, etc.) SHOULD be confirmed if they appear\n' +
    '   in the bulletin matching the known schedule. They are existing services, not new ones.\n\n' +
    '2. **modified** — Services where the bulletin shows a DIFFERENT time, day, or detail than what we have.\n' +
    '   Only report genuine permanent schedule changes, NOT one-time cancellations or temporary adjustments.\n' +
    '   For each: service_num, field changed, old value, new value.\n' +
    '   Do NOT report a modification if the values are the same.\n\n' +
    '3. **not_found** — Service numbers NOT mentioned in this bulletin.\n' +
    '   This does NOT mean cancelled. Bulletins often omit the full schedule. Just list the numbers.\n' +
    '   Seasonal services (marked with {lent}, {holy_week}, etc.) that DO appear in the bulletin\n' +
    '   should go in confirmed, not here. Only list them here if truly absent from the bulletin.\n\n' +
    '4. **new_services** — Recurring services in the bulletin NOT ALREADY in the known schedule.\n' +
    '   Only genuinely new scheduled services (not one-time events).\n' +
    '   IMPORTANT: If a service matches an existing seasonal entry (same type, day, time), put it in\n' +
    '   confirmed instead. Do not duplicate services that already exist in the known schedule.\n' +
    '   Valid types: ' + STANDARDS.SERVICE_TYPES.join(', ') + '\n' +
    '   Valid days: ' + STANDARDS.DAYS.join(', ') + '\n\n' +
    '5. **events** — One-time or limited-run community events, social gatherings, educational programs.\n' +
    '   Valid categories: ' + STANDARDS.EVENT_CATEGORIES.join(', ') + '\n\n' +
    '6. **notices** — Schedule changes, cancellations, closures, or important announcements.\n\n' +
    '## IGNORE\n' +
    '- Mass intentions (names with "Req by", "+", "In memory of")\n' +
    '- Financial reports, collections, stewardship appeals\n' +
    '- Staff/volunteer listings, ministry schedules, committee rosters\n' +
    '- Children/youth education (CCD, faith formation, K-12 school news)\n' +
    '- Sacramental prep (RCIA, baptism prep, marriage prep, first communion)\n' +
    '- Editorial content, pastor letters, scripture readings, devotional text\n' +
    '- Ads, business listings, sponsor pages\n\n' +
    '## OUTPUT FORMAT\n' +
    'Return ONLY raw JSON. No markdown wrapping. Start with { end with }.\n' +
    '{\n' +
    '  "confirmed": [1, 2, 3],\n' +
    '  "modified": [\n' +
    '    {"service_num": 4, "field": "time", "old_value": "09:00", "new_value": "08:30", "confidence": 0.95}\n' +
    '  ],\n' +
    '  "not_found": [6, 8],\n' +
    '  "new_services": [\n' +
    '    {"type": "stations_of_cross", "day": "friday", "time": "19:00",\n' +
    '     "language": "en", "seasonal": "lent", "notes": "followed by Benediction",\n' +
    '     "confidence": 0.9}\n' +
    '  ],\n' +
    '  "events": [\n' +
    '    {"title": "Fish Fry", "date": "' + currentYear + '-03-13", "time": "17:00",\n' +
    '     "end_time": "19:00", "location": "Parish Hall",\n' +
    '     "category": "fish_fry", "description": "...", "confidence": 0.95}\n' +
    '  ],\n' +
    '  "notices": [\n' +
    '    {"title": "No Daily Mass Monday", "details": "Pastor away",\n' +
    '     "effective_date": "' + currentYear + '-03-16", "confidence": 0.9}\n' +
    '  ],\n' +
    '  "clergy": [{"role": "pastor", "name": "Fr. John Smith"}],\n' +
    '  "bulletin_date": "' + currentYear + '-03-15",\n' +
    '  "notes": "any parsing difficulties or ambiguities"\n' +
    '}\n\n' +
    'Rules:\n' +
    '- Use null for missing fields, not empty strings.\n' +
    '- Times in 24-hour HH:MM format.\n' +
    '- Dates in YYYY-MM-DD format. Year is ' + currentYear + '.\n' +
    '- Use individual day values (monday, tuesday, etc.) for each occurrence. Never use "weekday" or "daily".\n' +
    '- Saturday Mass at 2:00 PM or later = sunday_mass (vigil). Before 2:00 PM = daily_mass.\n' +
    '- Do NOT put mass intentions, prayer requests, or memorial names in events.\n' +
    '- For clergy, include only ordained ministers (pastor, parochial vicar, deacon). Not staff.';
}

module.exports = {
  buildChangePrompt: buildChangePrompt
};
