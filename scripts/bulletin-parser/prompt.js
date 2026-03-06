// prompt.js — Extraction prompt for Claude Vision bulletin parsing

var TAXONOMY = [
  'mass_change', 'confession_change', 'adoration_change', 'baptism',
  'first_communion', 'confirmation', 'marriage', 'anointing_of_sick', 'rcia',
  'rosary', 'stations_of_cross', 'novena', 'holy_hour', 'benediction',
  'divine_mercy', 'first_friday', 'first_saturday',
  'bible_study', 'book_club', 'speaker_series', 'retreat', 'mission',
  'faith_formation', 'adult_education', 'youth_group',
  'fish_fry', 'pancake_breakfast', 'potluck', 'dinner_dance', 'trivia_night',
  'movie_night', 'game_night', 'picnic', 'festival',
  'choir', 'lector_training', 'emhc_training', 'altar_server', 'usher', 'greeter',
  'bereavement', 'prayer_shawl', 'food_pantry', 'clothing_drive', 'blood_drive',
  'habitat_for_humanity',
  'parish_council', 'finance_council', 'annual_report', 'census',
  'stewardship', 'building_fund', 'capital_campaign', 'office_hours_change',
  'pastor_letter', 'staff_change', 'facility_update', 'weather_closure',
  'thank_you', 'remembrance', 'milestone', 'general',
];

/**
 * Build the extraction prompt for a bulletin page.
 * @param {string} churchName
 * @param {string} churchTown
 * @param {number} pageNumber - 1-indexed
 * @param {number} totalPages
 * @param {object} [profile] - parish profile for context injection
 * @returns {string}
 */
function buildPrompt(churchName, churchTown, pageNumber, totalPages, profile) {
  var context = '';
  if (profile) {
    if (profile.page_layout_notes) {
      context += '\nLayout notes for this parish: ' + profile.page_layout_notes;
    }
    if (profile.known_recurring && profile.known_recurring.length) {
      context += '\nKnown recurring events at this parish: ' + profile.known_recurring.join('; ');
    }
    if (profile.common_locations && profile.common_locations.length) {
      context += '\nCommon venue names: ' + profile.common_locations.join(', ');
    }
    if (profile.parsing_notes) {
      context += '\nParsing notes: ' + profile.parsing_notes;
    }
  }

  return 'You are parsing page ' + pageNumber + ' of ' + totalPages +
    ' of the weekly bulletin for ' + churchName + ' in ' + churchTown + '.' +
    context +
    '\n\n' +
    'Extract ALL items of interest from this bulletin page. Include:\n' +
    '- Events with dates, times, locations, descriptions\n' +
    '- Announcements (staff changes, facility updates, thank-yous)\n' +
    '- Schedule changes (Mass time changes, confession additions, cancellations)\n' +
    '- Ministry sign-ups and volunteer opportunities\n' +
    '- Social events (fish fries, dinners, fundraisers)\n' +
    '- Educational programs (Bible studies, RCIA, faith formation)\n' +
    '- Devotional activities (rosary, novena, holy hour, stations of the cross)\n' +
    '- Sacramental preparations (baptism, confirmation, first communion dates)\n' +
    '- Collection/financial report totals (just totals, not individual names)\n' +
    '- Pastor letter highlights (brief summary of key points)\n' +
    '- Any other parish community information\n' +
    '\n' +
    'IGNORE completely:\n' +
    '- Paid advertisements and sponsor ads\n' +
    '- Publisher branding (LPi, Diocesan, etc.)\n' +
    '- Copyright notices\n' +
    '- Generic liturgical calendar entries (readings, saint of the day)\n' +
    '- The permanent weekly Mass/confession schedule sidebar IF it appears unchanged\n' +
    '  (only extract schedule items if they indicate a CHANGE or special addition)\n' +
    '\n' +
    'For EACH item found, use this JSON structure:\n' +
    '\n' +
    '{\n' +
    '  "items": [\n' +
    '    {\n' +
    '      "category": "<from: ' + TAXONOMY.join('|') + '>",\n' +
    '      "title": "<concise title>",\n' +
    '      "description": "<full description preserving key details>",\n' +
    '      "event_date": "<YYYY-MM-DD or null>",\n' +
    '      "event_time": "<HH:MM 24hr or null>",\n' +
    '      "end_time": "<HH:MM 24hr or null>",\n' +
    '      "end_date": "<YYYY-MM-DD or null if same day>",\n' +
    '      "location": "<venue within parish: Parish Hall, Church, Room 201, etc. or null>",\n' +
    '      "contact_name": "<if mentioned, else null>",\n' +
    '      "contact_phone": "<if mentioned, else null>",\n' +
    '      "contact_email": "<if mentioned, else null>",\n' +
    '      "registration_url": "<if mentioned, else null>",\n' +
    '      "recurring": "<weekly|monthly|one_time or null>",\n' +
    '      "tags": ["<relevant: lent, fundraiser, seniors, families, youth, free, etc.>"],\n' +
    '      "confidence": <0.0-1.0>\n' +
    '    }\n' +
    '  ],\n' +
    '  "page_type": "<cover|schedule|events|announcements|ads|mixed>",\n' +
    '  "notes": "<any parsing difficulties or ambiguities>"\n' +
    '}\n' +
    '\n' +
    'RULES:\n' +
    '- Return ONLY valid JSON. No markdown fencing, no preamble, no explanation.\n' +
    '- If the page is entirely ads or boilerplate, return {"items": [], "page_type": "ads", "notes": "..."}\n' +
    '- Use null (not empty string) for missing fields.\n' +
    '- Dates must be YYYY-MM-DD format. Infer the year from context (current year is ' + new Date().getFullYear() + ').\n' +
    '- Times must be HH:MM in 24-hour format.\n' +
    '- For the "confidence" field: 1.0 = certain, 0.8+ = high confidence, 0.5-0.8 = some ambiguity, <0.5 = uncertain.\n' +
    '- Prefer specific categories over "general". Only use "general" when no other category fits.\n' +
    '- If an item spans multiple categories (e.g. a fundraiser dinner), pick the most specific one.';
}

module.exports = {
  buildPrompt: buildPrompt,
  TAXONOMY: TAXONOMY,
};
