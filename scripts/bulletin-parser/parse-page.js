// parse-page.js — Send a bulletin page image to Claude Vision API
// Returns parsed JSON with extracted items

var Anthropic = require('@anthropic-ai/sdk');
var config = require('./config');
var prompt = require('./prompt');

// ── Valid enums (must match DATA_STANDARDS.md + schema) ──
var VALID_ITEM_TYPES = ['service', 'event', 'notice'];
var VALID_CATEGORIES = [
  // Services
  'mass','confession','adoration','perpetual_adoration','rosary','stations_of_cross',
  'novena','holy_hour','divine_mercy','miraculous_medal','anointing_of_sick',
  'communion_service','benediction','vespers','gorzkie_zale','blessing',
  'prayer_group','devotion',
  // Holy Week
  'holy_thursday_mass','good_friday_service','easter_vigil_mass',
  'palm_sunday_mass','easter_sunday_mass',
  // Events
  'fish_fry','pancake_breakfast','potluck','dinner_dance','trivia_night','movie_night',
  'game_night','picnic','festival','bible_study','book_club','speaker_series','retreat',
  'mission','adult_education','youth_group','choir','senior_group','fraternal',
  'performance','concert',
  // Notices
  'weather_closure','schedule_change','office_hours_change',
  'general'
];
var VALID_RECURRING = [null, 'weekly', 'monthly', 'one_time'];
var VALID_SEASONAL = [null, 'year_round', 'lent', 'advent', 'holy_week', 'easter_season', 'academic_year', 'summer'];
var VALID_DAYS = [null, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'weekday', 'daily', 'first_friday', 'first_saturday', 'holyday', 'holyday_eve',
  'good_friday', 'holy_thursday', 'holy_saturday', 'easter_vigil',
  'palm_sunday', 'easter_sunday', 'civil_holiday'];
var TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

var client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

/**
 * Parse a single bulletin page image with Claude Vision.
 * @param {Buffer} imageBuffer - PNG or JPEG image buffer
 * @param {number} pageNumber - 1-indexed
 * @param {number} totalPages
 * @param {string} churchName
 * @param {string} churchTown
 * @param {object} [profile] - parish profile for context
 * @returns {Promise<object>} { items: [...], page_type, notes, usage, cost }
 */
function parsePage(imageBuffer, pageNumber, totalPages, churchName, churchTown, profile) {
  var base64 = imageBuffer.toString('base64');

  // Detect media type from buffer header
  var mediaType = 'image/png';
  if (imageBuffer[0] === 0xFF && imageBuffer[1] === 0xD8) {
    mediaType = 'image/jpeg';
  }

  var promptText = prompt.buildPrompt(churchName, churchTown, pageNumber, totalPages, profile);

  return client.messages.create({
    model: config.PARSE_MODEL,
    max_tokens: config.MAX_TOKENS,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: base64,
          },
        },
        {
          type: 'text',
          text: promptText,
        },
      ],
    }],
  }).then(function(response) {
    var text = response.content[0].text;

    // Calculate cost (Claude Sonnet pricing: $3/M input, $15/M output)
    var inputTokens = response.usage.input_tokens || 0;
    var outputTokens = response.usage.output_tokens || 0;
    var cost = (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);

    // Try to parse JSON from response
    var parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Try extracting JSON from markdown code block
      var jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1]);
        } catch (e2) {
          // Return raw text as error
          return {
            items: [],
            page_type: 'error',
            notes: 'Failed to parse JSON. Raw response: ' + text.substring(0, 500),
            usage: { input_tokens: inputTokens, output_tokens: outputTokens },
            cost: cost,
          };
        }
      } else {
        return {
          items: [],
          page_type: 'error',
          notes: 'No JSON in response. Raw: ' + text.substring(0, 500),
          usage: { input_tokens: inputTokens, output_tokens: outputTokens },
          cost: cost,
        };
      }
    }

    // Validate and normalize items
    var items = Array.isArray(parsed.items) ? parsed.items : [];
    items = items.map(function(item) {
      return {
        item_type: item.item_type || 'event',
        category: item.category || 'general',
        title: item.title || 'Untitled',
        original_text: item.original_text || null,
        description: item.original_text || item.description || null,
        day: item.day || null,
        event_date: item.event_date || null,
        event_time: item.event_time || null,
        end_time: item.end_time || null,
        end_date: item.end_date || null,
        location: item.location || null,
        contact_name: item.contact_name || null,
        contact_phone: item.contact_phone || null,
        contact_email: item.contact_email || null,
        registration_url: item.registration_url || null,
        recurring: item.recurring || null,
        seasonal: item.seasonal || null,
        language: item.language || null,
        host_parish: item.host_parish || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.5,
      };
    });

    // Validate and sanitize enum fields from Claude output
    items.forEach(function(item) {
      // item_type
      if (VALID_ITEM_TYPES.indexOf(item.item_type) < 0) {
        console.log('      [sanitize] Invalid item_type "' + item.item_type + '" → "event" for: ' + item.title);
        item.item_type = 'event';
      }
      // category
      if (VALID_CATEGORIES.indexOf(item.category) < 0) {
        console.log('      [sanitize] Invalid category "' + item.category + '" → "general" for: ' + item.title);
        item.category = 'general';
        item.confidence = Math.min(item.confidence, 0.6); // flag for manual review
      }
      // day
      if (item.day && VALID_DAYS.indexOf(item.day) < 0) {
        console.log('      [sanitize] Invalid day "' + item.day + '" → null for: ' + item.title);
        item.day = null;
      }
      // recurring
      if (item.recurring && VALID_RECURRING.indexOf(item.recurring) < 0) {
        console.log('      [sanitize] Invalid recurring "' + item.recurring + '" → null for: ' + item.title);
        item.recurring = null;
      }
      // seasonal
      if (item.seasonal && VALID_SEASONAL.indexOf(item.seasonal) < 0) {
        console.log('      [sanitize] Invalid seasonal "' + item.seasonal + '" → null for: ' + item.title);
        item.seasonal = null;
      }
      // time format
      if (item.event_time && !TIME_RE.test(item.event_time)) {
        console.log('      [sanitize] Invalid time "' + item.event_time + '" → null for: ' + item.title);
        item.event_time = null;
      }
      if (item.end_time && !TIME_RE.test(item.end_time)) {
        console.log('      [sanitize] Invalid end_time "' + item.end_time + '" → null for: ' + item.title);
        item.end_time = null;
      }
      // date format
      if (item.event_date && !DATE_RE.test(item.event_date)) {
        console.log('      [sanitize] Invalid date "' + item.event_date + '" → null for: ' + item.title);
        item.event_date = null;
      }
      if (item.end_date && !DATE_RE.test(item.end_date)) {
        console.log('      [sanitize] Invalid end_date "' + item.end_date + '" → null for: ' + item.title);
        item.end_date = null;
      }
    });

    // Flag items matching hard exclusion patterns (DATA_STANDARDS.md)
    // These still get stored but with flagged status for review
    var HARD_EXCLUSION_PATTERNS = [
      { re: /faith\s*formation/i, reason: 'sacramental_prep' },
      { re: /ccd|catechism/i, reason: 'children_education' },
      { re: /confirmation\s*(mass|prep|retreat|class)/i, reason: 'sacramental_prep' },
      { re: /first\s*communion/i, reason: 'sacramental_prep' },
      { re: /rcia|rite\s*of\s*election/i, reason: 'sacramental_prep' },
      { re: /sunday\s*school/i, reason: 'children_education' },
      { re: /baptism\s*(prep|class)/i, reason: 'sacramental_prep' },
      { re: /marriage\s*prep/i, reason: 'sacramental_prep' },
      { re: /altar\s*server/i, reason: 'ministry_scheduling' },
      { re: /lector|emhc|usher\s*(schedule|training)/i, reason: 'ministry_scheduling' },
      { re: /offertory|collection(?!.*food)|stewardship/i, reason: 'financial' },
    ];
    items.forEach(function(item) {
      var text = (item.title || '') + ' ' + (item.original_text || '');
      for (var i = 0; i < HARD_EXCLUSION_PATTERNS.length; i++) {
        if (HARD_EXCLUSION_PATTERNS[i].re.test(text)) {
          item._flagged = HARD_EXCLUSION_PATTERNS[i].reason;
          console.log('      [flag] ' + HARD_EXCLUSION_PATTERNS[i].reason + ': ' + item.title);
          break;
        }
      }
    });

    // ── Fix Saturday morning mass titles ──
    // If title says "Sunday Mass" or "Vigil Mass" but original_text indicates Saturday before 2PM
    items.forEach(function(item) {
      if (item.category !== 'mass') return;
      var text = ((item.title || '') + ' ' + (item.original_text || '')).toLowerCase();
      var hasSaturday = text.indexOf('saturday') !== -1 || text.indexOf('sat ') !== -1 || text.indexOf('sat.') !== -1;
      if (!hasSaturday) return;
      var time = item.event_time;
      if (!time) return;
      var titleLow = (item.title || '').toLowerCase();
      if (time < '14:00') {
        // Saturday before 2PM = Daily Mass, never Sunday/Vigil
        if (titleLow.indexOf('sunday') !== -1 || titleLow.indexOf('vigil') !== -1 || titleLow.indexOf('weekend') !== -1) {
          console.log('      [fix] Saturday AM "' + item.title + '" @ ' + time + ' → "Daily Mass"');
          item.title = 'Daily Mass';
        }
      } else {
        // Saturday 2PM+ = Vigil Mass
        if (titleLow.indexOf('sunday') !== -1 || titleLow.indexOf('daily') !== -1) {
          console.log('      [fix] Saturday PM "' + item.title + '" @ ' + time + ' → "Vigil Mass"');
          item.title = 'Vigil Mass';
        }
      }
    });

    // ── Reclassify communion services miscategorized as "mass" ──
    items.forEach(function(item) {
      if (item.category !== 'mass') return;
      var text = ((item.title || '') + ' ' + (item.original_text || '')).toLowerCase();
      if (text.indexOf('communion service') !== -1 || text.indexOf('word and communion') !== -1 ||
          text.indexOf('communion celebration') !== -1) {
        console.log('      [fix] Reclassified "' + item.title + '" → communion_service');
        item.category = 'communion_service';
      }
    });

    // ── Reclassify Holy Week items from generic "mass" to specific types ──
    items.forEach(function(item) {
      var text = ((item.title || '') + ' ' + (item.original_text || '')).toLowerCase();
      // Holy Thursday
      if (item.category === 'mass' && (text.indexOf('holy thursday') !== -1 || text.indexOf('lord\'s supper') !== -1 || text.indexOf('lords supper') !== -1)) {
        console.log('      [fix] Reclassified "' + item.title + '" → holy_thursday_mass');
        item.category = 'holy_thursday_mass';
      }
      // Good Friday
      if ((item.category === 'mass' || item.category === 'general' || item.category === 'devotion') &&
          (text.indexOf('good friday') !== -1 || text.indexOf('veneration of the cross') !== -1 || text.indexOf('tre ore') !== -1)) {
        console.log('      [fix] Reclassified "' + item.title + '" → good_friday_service');
        item.category = 'good_friday_service';
      }
      // Easter Vigil
      if (item.category === 'mass' && (text.indexOf('easter vigil') !== -1 || (text.indexOf('vigil') !== -1 && text.indexOf('holy saturday') !== -1))) {
        console.log('      [fix] Reclassified "' + item.title + '" → easter_vigil_mass');
        item.category = 'easter_vigil_mass';
      }
      // Palm Sunday
      if (item.category === 'mass' && text.indexOf('palm sunday') !== -1) {
        console.log('      [fix] Reclassified "' + item.title + '" → palm_sunday_mass');
        item.category = 'palm_sunday_mass';
      }
      // Easter Sunday
      if (item.category === 'mass' && text.indexOf('easter sunday') !== -1 && text.indexOf('vigil') === -1) {
        console.log('      [fix] Reclassified "' + item.title + '" → easter_sunday_mass');
        item.category = 'easter_sunday_mass';
      }
      // Miraculous Medal (Claude may output "novena" or "devotion")
      if ((item.category === 'novena' || item.category === 'devotion') &&
          text.indexOf('miraculous medal') !== -1) {
        console.log('      [fix] Reclassified "' + item.title + '" → miraculous_medal');
        item.category = 'miraculous_medal';
      }
      // Gorzkie Zale (Claude may output "devotion" or "general")
      if ((item.category === 'devotion' || item.category === 'general') &&
          (text.indexOf('gorzkie') !== -1 || text.indexOf('bitter lament') !== -1)) {
        console.log('      [fix] Reclassified "' + item.title + '" → gorzkie_zale');
        item.category = 'gorzkie_zale';
      }
      // Fix old seasonal values: christmas → advent, easter → easter_season
      if (item.seasonal === 'christmas') {
        item.seasonal = 'advent';
      }
      if (item.seasonal === 'easter') {
        item.seasonal = 'easter_season';
      }
    });

    // ── Split blob mass schedule items ──
    // Detect items where Claude crammed multiple Mass times into one item
    var TIME_EXTRACT_RE = /\b([01]?\d|2[0-3]):([0-5]\d)\s*(am|pm|AM|PM)?\b/g;
    var splitItems = [];
    items = items.filter(function(item) {
      if (item.category !== 'mass' || item.item_type !== 'service') return true;
      var text = item.original_text || '';
      var times = [];
      var m;
      while ((m = TIME_EXTRACT_RE.exec(text)) !== null) {
        var hr = parseInt(m[1], 10);
        var min = m[2];
        var ampm = (m[3] || '').toLowerCase();
        if (ampm === 'pm' && hr < 12) hr += 12;
        if (ampm === 'am' && hr === 12) hr = 0;
        var t24 = (hr < 10 ? '0' : '') + hr + ':' + min;
        if (times.indexOf(t24) < 0) times.push(t24);
      }
      TIME_EXTRACT_RE.lastIndex = 0;
      // Only split if we found 3+ distinct times (indicates a schedule blob)
      if (times.length < 3) return true;
      // This is a blob — split into individual items
      console.log('      [split] Breaking "' + item.title + '" into ' + times.length + ' individual Mass items');
      var textLow = text.toLowerCase();
      times.forEach(function(t) {
        // Determine day context from surrounding text
        var isSaturday = textLow.indexOf('saturday') !== -1 || textLow.indexOf('sat ') !== -1;
        var isSunday = textLow.indexOf('sunday') !== -1 || textLow.indexOf('sun ') !== -1;
        var title = 'Mass';
        var inferredDay = null;
        // Try to infer day for this specific time
        // Look for patterns like "Saturday: 9:00 AM" or "Sunday 7:30, 9:00"
        if (isSaturday && t < '14:00') { title = 'Daily Mass'; inferredDay = 'saturday'; }
        else if (isSaturday && t >= '14:00') { title = 'Vigil Mass'; inferredDay = 'saturday'; }
        else if (isSunday) { title = 'Sunday Mass'; inferredDay = 'sunday'; }
        else title = 'Daily Mass';

        splitItems.push({
          item_type: 'service',
          category: 'mass',
          title: title,
          original_text: item.original_text,
          description: null,
          day: inferredDay || item.day || null,
          event_date: null,
          event_time: t,
          end_time: null,
          end_date: null,
          location: item.location,
          contact_name: null,
          contact_phone: null,
          contact_email: null,
          registration_url: null,
          recurring: 'weekly',
          seasonal: item.seasonal,
          language: item.language,
          host_parish: item.host_parish,
          tags: item.tags || [],
          confidence: 0.85,
          source_page: item.source_page,
        });
      });
      return false; // remove the blob item
    });
    if (splitItems.length > 0) {
      items = items.concat(splitItems);
    }

    // Post-extraction filters: drop noise before it reaches downstream
    var preFilterCount = items.length;
    items = items.filter(function(item) {
      // Drop items Claude flagged as recruitment/sign-up despite extracting
      var titleLower = (item.title || '').toLowerCase();
      var textLower = (item.original_text || '').toLowerCase();
      if (titleLower.indexOf('recruitment') !== -1 || titleLower.indexOf('sign-up') !== -1 ||
          titleLower.indexOf('sign up') !== -1 ||
          (textLower.indexOf('we need') !== -1 && textLower.indexOf('to join') !== -1) ||
          (textLower.indexOf('sign-ups') !== -1 && textLower.indexOf('needed') !== -1)) {
        console.log('      [filter] Dropped (recruitment/sign-up): ' + item.title);
        return false;
      }
      // Drop mass intention items that leaked through prompt exclusions
      // Intention markers: † (cross), "Req by", "Requested by", "In memory of"
      if (textLower.indexOf('req by') !== -1 || textLower.indexOf('req. by') !== -1 ||
          textLower.indexOf('requested by') !== -1 ||
          (textLower.indexOf('\u2020') !== -1 && textLower.indexOf('family') !== -1) ||
          (textLower.indexOf('\u2020') !== -1 && textLower.indexOf('req') !== -1)) {
        console.log('      [filter] Dropped (mass intention): ' + item.title);
        return false;
      }
      // Drop low-confidence items (Claude hedging = likely noise)
      if (item.confidence < 0.5) {
        console.log('      [filter] Dropped (confidence ' + item.confidence + '): ' + item.title);
        return false;
      }
      // Require at least one actionable field: date, time, location, or recurring pattern
      if (!item.event_date && !item.event_time && !item.location && !item.recurring) {
        console.log('      [filter] Dropped (no date/time/location/recurring): ' + item.title);
        return false;
      }
      return true;
    });
    if (preFilterCount > items.length) {
      console.log('      [filter] Kept ' + items.length + '/' + preFilterCount + ' items');
    }

    // Extract clergy and mass_schedule from page-level output
    var clergy = Array.isArray(parsed.clergy) ? parsed.clergy : [];
    var massSchedule = Array.isArray(parsed.mass_schedule) ? parsed.mass_schedule : [];

    return {
      items: items,
      clergy: clergy,
      mass_schedule: massSchedule,
      page_type: parsed.page_type || 'mixed',
      notes: parsed.notes || null,
      usage: { input_tokens: inputTokens, output_tokens: outputTokens },
      cost: cost,
    };
  });
}

/**
 * Parse all pages of a bulletin sequentially.
 * @param {Array<{page: number, buffer: Buffer}>} pages
 * @param {string} churchName
 * @param {string} churchTown
 * @param {object} [profile]
 * @returns {Promise<object>} { allItems: [...], pageResults: [...], totalCost }
 */
function parseAllPages(pages, churchName, churchTown, profile) {
  var allItems = [];
  var pageResults = [];
  var totalCost = 0;
  var clergy = [];
  var massSchedule = [];
  var i = 0;

  function next() {
    if (i >= pages.length) {
      // Convert mass_schedule entries into proper service items
      if (massSchedule.length > 0) {
        var scheduleSourcePage = 1; // mass_schedule typically from page 1
        var msConverted = 0;
        massSchedule.forEach(function(ms) {
          // Check if this schedule entry already exists as an item
          var isDup = allItems.some(function(item) {
            return item.category === 'mass' && item.event_time === ms.time;
          });
          if (!isDup) {
            var dayVal = (ms.day || '').toLowerCase();
            var title = 'Mass';
            if (ms.notes) title = ms.notes;
            else if (dayVal === 'saturday' && ms.time && ms.time >= '14:00') title = 'Vigil Mass';
            else if (dayVal === 'sunday') title = 'Sunday Mass';
            else title = 'Daily Mass';

            allItems.push({
              item_type: 'service',
              category: 'mass',
              title: title,
              original_text: 'Mass Schedule: ' + (ms.day || '') + ' ' + (ms.time || '') + (ms.notes ? ' (' + ms.notes + ')' : ''),
              description: null,
              day: dayVal || null,
              event_date: null,
              event_time: ms.time || null,
              end_time: null,
              end_date: null,
              location: null,
              contact_name: null,
              contact_phone: null,
              contact_email: null,
              registration_url: null,
              recurring: 'weekly',
              seasonal: null,
              language: null,
              host_parish: null,
              tags: [dayVal],
              confidence: 0.95,
              source_page: scheduleSourcePage,
            });
            msConverted++;
          }
        });
        if (msConverted > 0) {
          console.log('\n  [mass_schedule] Converted ' + msConverted + ' schedule entries into service items');
        }
      }

      // Cross-page deduplication
      var dedupedItems = deduplicateItems(allItems);
      if (dedupedItems.length < allItems.length) {
        console.log('\n  [dedup] Removed ' + (allItems.length - dedupedItems.length) +
          ' cross-page duplicate(s), ' + dedupedItems.length + ' items remain');
      }
      return Promise.resolve({
        allItems: dedupedItems,
        pageResults: pageResults,
        totalCost: totalCost,
        clergy: clergy,
        massSchedule: massSchedule,
      });
    }

    var page = pages[i];
    i++;
    console.log('    Parsing page ' + page.page + '/' + pages.length + '...');

    return parsePage(
      page.buffer, page.page, pages.length,
      churchName, churchTown, profile
    ).then(function(result) {
      var svcCount = result.items.filter(function(it) { return it.item_type === 'service'; }).length;
      var evtCount = result.items.filter(function(it) { return it.item_type === 'event'; }).length;
      var notCount = result.items.filter(function(it) { return it.item_type === 'notice'; }).length;
      console.log('      → ' + result.items.length + ' items (' +
        svcCount + ' svc, ' + evtCount + ' evt, ' + notCount + ' notice), $' +
        result.cost.toFixed(4) + ' (' + result.usage.input_tokens + ' in / ' +
        result.usage.output_tokens + ' out)');

      pageResults.push(result);
      totalCost += result.cost;

      // Take clergy and mass_schedule from first page that provides them
      if (clergy.length === 0 && result.clergy.length > 0) {
        clergy = result.clergy;
      }
      if (massSchedule.length === 0 && result.mass_schedule.length > 0) {
        massSchedule = result.mass_schedule;
      }

      // Add source_page to each item
      result.items.forEach(function(item) {
        item.source_page = page.page;
        allItems.push(item);
      });

      return next();
    });
  }

  return next();
}

/**
 * Normalize a title for comparison: lowercase, strip punctuation, collapse whitespace.
 */
function normalizeTitle(title) {
  return (title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count how many non-null fields an item has (proxy for completeness).
 */
function itemCompleteness(item) {
  var score = 0;
  var fields = ['event_date', 'event_time', 'end_time', 'location',
    'contact_name', 'contact_phone', 'contact_email', 'registration_url'];
  fields.forEach(function(f) { if (item[f]) score++; });
  // Bonus for longer original_text (more detail)
  if (item.original_text) score += Math.min(item.original_text.length / 100, 3);
  return score;
}

/**
 * Check if two normalized titles are similar enough to be duplicates.
 * Uses substring containment — if one title contains the other, they match.
 */
function titlesMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  // One contains the other (handles "Polish Food Sale" vs "POLISH FOOD SALE!!!")
  if (a.indexOf(b) !== -1 || b.indexOf(a) !== -1) return true;
  // Check if first 20 chars match (handles truncation differences)
  if (a.length > 15 && b.length > 15 && a.substring(0, 20) === b.substring(0, 20)) return true;
  return false;
}

/**
 * Deduplicate items across pages. When the same item appears on multiple pages
 * (brief teaser on one, full details on another), keep the most complete version.
 */
function deduplicateItems(items) {
  var dominated = {};  // indices of items to remove

  for (var a = 0; a < items.length; a++) {
    if (dominated[a]) continue;
    var itemA = items[a];
    var normA = normalizeTitle(itemA.title);

    for (var b = a + 1; b < items.length; b++) {
      if (dominated[b]) continue;
      var itemB = items[b];

      // Must be same category to be duplicates
      if (itemA.category !== itemB.category) continue;

      var normB = normalizeTitle(itemB.title);
      var isDupe = false;

      // Path 1: Title match (cross-page teasers, repeated announcements)
      if (titlesMatch(normA, normB)) {
        // If both have dates, they must match
        if (itemA.event_date && itemB.event_date && itemA.event_date !== itemB.event_date) continue;
        // If both have times, they must match
        if (itemA.event_time && itemB.event_time && itemA.event_time !== itemB.event_time) continue;
        isDupe = true;
      }

      // Path 2: Same recurring service with same time AND same day (duplicate schedule formats)
      if (!isDupe && itemA.item_type === 'service' && itemB.item_type === 'service' &&
          itemA.recurring && itemB.recurring &&
          itemA.event_time && itemB.event_time && itemA.event_time === itemB.event_time &&
          (itemA.day === itemB.day || !itemA.day || !itemB.day)) {
        isDupe = true;
      }

      if (!isDupe) continue;

      // These are duplicates — keep the more complete one
      var scoreA = itemCompleteness(itemA);
      var scoreB = itemCompleteness(itemB);
      var loser = scoreA >= scoreB ? b : a;
      var winner = scoreA >= scoreB ? a : b;
      dominated[loser] = true;
      console.log('  [dedup] "' + items[loser].title + '" (pg ' + items[loser].source_page +
        ') dominated by "' + items[winner].title + '" (pg ' + items[winner].source_page + ')');
    }
  }

  return items.filter(function(_, idx) { return !dominated[idx]; });
}

module.exports = {
  parsePage: parsePage,
  parseAllPages: parseAllPages,
};
