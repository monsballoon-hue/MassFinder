// prompt.js — Extraction prompt for Claude Vision bulletin parsing

var SERVICE_CATEGORIES = [
  'mass', 'confession', 'adoration', 'perpetual_adoration', 'rosary',
  'stations_of_cross', 'novena', 'holy_hour', 'divine_mercy',
  'miraculous_medal', 'anointing_of_sick', 'communion_service',
  'benediction', 'vespers', 'gorzkie_zale', 'blessing', 'prayer_group',
  'devotion',
  'holy_thursday_mass', 'good_friday_service', 'easter_vigil_mass',
  'palm_sunday_mass', 'easter_sunday_mass',
];

var EVENT_CATEGORIES = [
  'fish_fry', 'pancake_breakfast', 'potluck', 'dinner_dance', 'trivia_night',
  'movie_night', 'game_night', 'picnic', 'festival',
  'bible_study', 'book_club', 'speaker_series', 'retreat', 'mission',
  'adult_education', 'youth_group', 'choir', 'senior_group', 'fraternal',
  'performance', 'concert',
];

var NOTICE_CATEGORIES = [
  'weather_closure', 'schedule_change', 'office_hours_change',
];

var ALL_CATEGORIES = SERVICE_CATEGORIES.concat(EVENT_CATEGORIES).concat(NOTICE_CATEGORIES).concat(['general']);

var SEASONS = ['lent', 'advent', 'holy_week', 'easter_season', 'academic_year', 'summer'];

var DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'weekday', 'daily',
  'first_friday', 'first_saturday',
  'holyday', 'holyday_eve',
  'good_friday', 'holy_thursday', 'holy_saturday', 'easter_vigil',
  'palm_sunday', 'easter_sunday', 'civil_holiday'
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
    if (profile.skip_pages && profile.skip_pages.length) {
      context += '\nKnown ad/empty pages to skip: ' + profile.skip_pages.join(', ');
    }
    if (profile.known_recurring && profile.known_recurring.length) {
      context += '\nKnown recurring items at this parish: ' + profile.known_recurring.join('; ');
    }
    if (profile.common_locations && profile.common_locations.length) {
      context += '\nCommon venue names: ' + profile.common_locations.join(', ');
    }
    if (profile.parsing_notes) {
      context += '\nParsing notes: ' + profile.parsing_notes;
    }
  }

  return 'You are a structured data extraction engine for Catholic parish bulletins. ' +
    'Extract SERVICES, EVENTS, and NOTICES that parishioners would attend or need to know about.' +
    '\n\n' +
    'This is page ' + pageNumber + ' of ' + totalPages +
    ' of the weekly bulletin for ' + churchName + ' in ' + churchTown + '.' +
    context +
    '\n\n' +
    '# THREE ITEM TYPES\n' +
    '\n' +
    'SERVICES — Liturgically designated by the Catholic Church. Recurring schedule items.\n' +
    'Categories: ' + SERVICE_CATEGORIES.join(', ') + '\n' +
    '\n' +
    'CATEGORY GUIDE FOR SERVICES:\n' +
    '- `mass` — Regular Mass (daily or Sunday). Use title to distinguish: ' +
    '"Daily Mass" for weekday/Saturday AM/holy day, "Vigil Mass" for Saturday PM, "Sunday Mass" for Sunday.\n' +
    '- `communion_service` — Eucharistic service WITHOUT a priest (no consecration, just distribution). ' +
    'NOT the same as Mass. Use when bulletin says "Communion Service" or "Word and Communion".\n' +
    '- `confession` — Reconciliation / Confession hours.\n' +
    '- `adoration` — Scheduled Eucharistic Adoration (specific hours/days).\n' +
    '- `perpetual_adoration` — 24/7 adoration chapel. Use ONLY for truly perpetual (all day, every day).\n' +
    '- `rosary` — Rosary.\n' +
    '- `divine_mercy` — Divine Mercy Chaplet.\n' +
    '- `miraculous_medal` — Miraculous Medal Novena (often weekly, e.g., Monday or Tuesday).\n' +
    '- `stations_of_cross` — Stations of the Cross (including Polish "Droga Krzyżowa", Portuguese "Via Sacra").\n' +
    '- `novena` — Any novena other than Miraculous Medal.\n' +
    '- `holy_hour` — Structured holy hour.\n' +
    '- `benediction` — Benediction of the Blessed Sacrament as a standalone service. ' +
    'If benediction is just the closing of an adoration period, do NOT use this — fold into the adoration item.\n' +
    '- `vespers` — Evening Prayer / Vespers / Liturgy of the Hours.\n' +
    '- `gorzkie_zale` — Polish Bitter Lamentations (Lenten devotion, usually Sunday afternoons).\n' +
    '- `blessing` — Blessings (Holy Saturday food blessing / Swieconka, throat blessing, etc.).\n' +
    '- `prayer_group` — Recurring prayer group meetings.\n' +
    '- `anointing_of_sick` — Communal Anointing of the Sick (ONLY if a scheduled time exists — skip if "by appointment only").\n' +
    '- `devotion` — LAST RESORT for devotional services that do not match any specific category above. ' +
    'Always prefer a specific category.\n' +
    '\n' +
    'HOLY WEEK / TRIDUUM CATEGORIES (use ONLY for the actual liturgical days):\n' +
    '- `holy_thursday_mass` — Holy Thursday Mass of the Lord\'s Supper.\n' +
    '- `good_friday_service` — Good Friday Passion service, Veneration of the Cross, Tre Ore.\n' +
    '- `easter_vigil_mass` — Easter Vigil (Holy Saturday night).\n' +
    '- `palm_sunday_mass` — Palm Sunday Mass.\n' +
    '- `easter_sunday_mass` — Easter Sunday Mass.\n' +
    'Do NOT use generic `mass` for these — use the specific Holy Week category.\n' +
    '\n' +
    'EVENTS — Social, educational, or community gatherings. NOT liturgically mandated.\n' +
    'Categories: ' + EVENT_CATEGORIES.join(', ') + '\n' +
    'Examples: fish fry, speaker series, Bible study, youth group meeting, choir practice, ' +
    'Knights of Columbus meeting, senior luncheon, parish picnic, Christmas play, concert.\n' +
    'NOTE: Any kind of performance (play, pageant, choir concert, living stations, talent show) ' +
    'is ALWAYS an event with category "performance" or "concert", even if it has religious content.\n' +
    '\n' +
    'NOTICES — Cancellations, closures, schedule changes, rain dates.\n' +
    'Categories: ' + NOTICE_CATEGORIES.join(', ') + '\n' +
    'Examples: "Fish fry cancelled due to snow", "No 7AM Mass Monday", ' +
    '"Office closed for holiday", "Rain date: March 22".\n' +
    '\n' +
    '# SEASONAL FLAG\n' +
    'If a SERVICE is tied to a liturgical season, set the `seasonal` field:\n' +
    'Values: ' + SEASONS.join(', ') + '\n' +
    'Clues: "during Lent", "Lenten", "this Advent", "Holy Week", "Easter season", ' +
    'or items listed under a seasonal banner/heading.\n' +
    'NOTE: Use "advent" for Advent season (NOT "christmas"). Use "easter_season" for Easter season.\n' +
    '"academic_year" is for services that only run during the school year (Sept-May).\n' +
    'Seasonal services (e.g., extra Lenten confessions, Friday Stations) are still their ' +
    'base service category (confession, stations_of_cross) with the seasonal flag set.\n' +
    'If a devotional lists multiple specific dates that all fall on the same day of the week ' +
    'during a season (e.g., Stations on March 6, 13, 20, 27 — all Fridays in Lent), ' +
    'extract as ONE item with recurring: "weekly" and the seasonal flag, NOT separate one-time items ' +
    'for each date. Use the first date as event_date. Include all dates in original_text.\n' +
    'A bilingual Mass added for Lent is category "mass" with seasonal "lent", NOT a "mass_change".\n' +
    '"mass_change" / "schedule_change" = changes to the EXISTING permanent schedule only.\n' +
    'The seasonal flag applies to SERVICES only (liturgical additions tied to a season). ' +
    'Community events that happen to have a seasonal theme (Easter egg hunt, Christmas party, ' +
    'Advent wreath making) are just regular events — do NOT set their seasonal flag.\n' +
    '\n' +
    '# WHAT TO EXTRACT\n' +
    'Each item must have at least one of: date, time, location, or a clear recurrence pattern.\n' +
    '\n' +
    '- The regular Mass and confession schedule (from page 1 if present)\n' +
    '- Schedule changes to existing services\n' +
    '- Seasonal services (Lenten stations, extra confessions, etc.)\n' +
    '- Events with date/time/location\n' +
    '- Cancellations and closures\n' +
    '- Recurring groups/meetings (Bible study, choir, senior group, K of C, prayer shawl, etc.) ' +
    'IF they have a scheduled time and recurrence\n' +
    '- Bereavement support groups IF structured and recurring (not general announcements)\n' +
    '- Food pantry, blood drive, clothing drive ONLY IF it is a specific structured event with ' +
    'date/time/location (not a general solicitation for donations)\n' +
    '\n' +
    '# WHAT TO IGNORE — SKIP ALL OF THESE\n' +
    'These are HARD EXCLUSIONS. Do NOT extract any of the following, even if they contain dates, times, or names:\n' +
    '\n' +
    '## MASS INTENTIONS (CRITICAL — often fills an entire page)\n' +
    'Skip the ENTIRE mass intentions section. This includes:\n' +
    '- "Mass Intentions", "Masses offered for", "This week\'s Masses are offered for"\n' +
    '- Any listing of names with "Req. by", "Requested by", "In memory of", "†" (cross symbol)\n' +
    '- Listings like "Saturday 4:00 PM — John Smith, Req. by the Smith Family"\n' +
    '- IMPORTANT: Some bulletins embed Mass TIMES within the intentions listing ' +
    '(e.g., "Monday, March 2 9:00 AM †Helen Bigelow Req by Family"). ' +
    'Do NOT extract individual Masses from the intentions section. ' +
    'The regular Mass schedule should come from the dedicated schedule block (usually page 1), ' +
    'not from intention listings. Each day\'s intention is NOT a separate Mass to extract.\n' +
    '- These overlay the existing Mass schedule and do NOT change it. Ignore completely.\n' +
    '\n' +
    '## CALENDAR / WEEKLY OVERVIEW SECTIONS (CRITICAL)\n' +
    '- Any demarcated section with a header like: "This Week", "This Week at a Glance", ' +
    '"This Week in View", "Upcoming at the Church", "Next Week\'s Schedule", ' +
    '"Events This Week", "Parish Calendar", "Coming Up", "Church Calendar", ' +
    '"Weekly Schedule", "What\'s Happening This Week", or similar.\n' +
    '- These sections are condensed calendars that list every daily Mass, rosary, ' +
    'and event for the coming week as individual line items. They restate the recurring ' +
    'schedule (already extracted) and mass intentions. Do NOT extract items from these sections.\n' +
    '- EXCEPTION: If a genuinely NEW event appears ONLY in this section and was not ' +
    'listed anywhere else in the bulletin, you may extract it. But individual daily Masses, ' +
    'rosaries, confessions, and adoration times from these calendars must be SKIPPED — ' +
    'they duplicate the recurring schedule.\n' +
    '\n' +
    '## COLLECTIONS & FINANCIAL\n' +
    '- Any form of: collections, second collections, special collections, additional collections,\n' +
    '  "passing the basket", "second basket", "basket of collections", collection reports,\n' +
    '  weekly offertory, financial reports, Catholic Relief Services Collection\n' +
    '- Stewardship, envelopes, online donations, collection totals, expense reports\n' +
    '  (heating, electric, water bills), parish finances, budget summaries\n' +
    '- Annual Catholic Appeal, bishop\'s fund, diocesan campaigns, stewardship appeals\n' +
    '- Building fund, capital campaign, memorial donations, Tree of Life donations\n' +
    '- Tithing explanations, donation instructions, pastoral guidance on giving\n' +
    '- Memorial candle lighting instructions or payment info, even with contact details\n' +
    '\n' +
    '## CHILDREN & YOUTH EDUCATION (CRITICAL — skip ALL of these)\n' +
    '- ALL PK-12 religious education: CCD, faith formation classes, Sunday school,\n' +
    '  religious ed for grades PreK/PK through 12, preschool, kindergarten, middle school, high school programs\n' +
    '- ANY item mentioning specific grade levels (\"Grades K-3\", \"Grades 8 and Up\", etc.)\n' +
    '- Youth group class schedules with grade levels — these are faith formation, NOT events\n' +
    '- Anything where the PRIMARY audience is minors (children\'s liturgy, teen Mass, etc.)\n' +
    '- Children-specific sacramental events: First Communion dates/rehearsals,\n' +
    '  Confirmation Mass/prep/retreat/breakfast, children\'s confession\n' +
    '- Confirmation Mass & Breakfast, Confirmation rehearsals, Confirmation retreat\n' +
    '- Recruitment for youth performances/plays (\"We need students in grades X-Y to join\") — ' +
    'this is a sign-up call targeting minors, not an attendable event\n' +
    '- NOTE: Adult education (Bible study, speaker series, adult retreat) IS extracted.\n' +
    '  The test is: is this primarily for adults? If yes, extract. If primarily for K-12, skip.\n' +
    '\n' +
    '## SACRAMENTAL POLICIES & PREP\n' +
    '- Baptism, First Communion, Confirmation, Marriage preparation policies\n' +
    '- RCIA, OCIA, Order of Christian Initiation for Adults — all program info\n' +
    '- Rite of Election, Scrutinies (First/Second/Third Scrutiny), RCIA rites\n' +
    '- Baptism/marriage preparation policies ("call the office 6 months in advance")\n' +
    '- Anything "by appointment only" with no scheduled time\n' +
    '\n' +
    '## STAFF, BOARDS & MINISTRY LISTINGS\n' +
    '- Admin staff listings, music directors, school administrators, office personnel\n' +
    '- Ministry staff, music ministry, cemetery staff, groundskeepers, maintenance staff\n' +
    '- Advisory, Finance, Pastoral, or Religious boards or councils — skip entirely\n' +
    '- Any listing that is just names, titles, and contact details with no event attached\n' +
    '- Liturgical ministry schedules (lector, EMHC, usher, greeter, altar server assignments)\n' +
    '- Altar server anything (recruitment, training, schedules)\n' +
    '- Eucharistic minister schedules or training\n' +
    '- Lector training, EMHC training\n' +
    '- "Office of Safe Environment" / "Victim Assistance" / diocesan hotline notices\n' +
    '\n' +
    '## DEVOTIONAL & EDITORIAL CONTENT\n' +
    '- Pastor letters, reflections, homily notes, messages from the pastor/bishop/pope\n' +
    '- "Our Faith" sections — long explanations about the faith or liturgical season\n' +
    '- Gospel meditations, saint of the day write-ups, extended devotional reflections\n' +
    '- Scripture readings, Gospel passages, Today\'s Readings, responsorial psalm, antiphon\n' +
    '- Excerpts from the Catechism, Biblical verses as standalone text blocks\n' +
    '- Quotes attributed to people in a section, unless attached to event details\n' +
    '- Prayers (Nicene Creed, Our Father), prayer intentions, prayer lists ("please pray for...")\n' +
    '- Any section with Bible verses prominently displayed that is explanation, not an event\n' +
    '- Speaker/presenter bios (extract only the EVENT details, not the bio)\n' +
    '\n' +
    '## SCHOOL & SCHOLARSHIP\n' +
    '- Anything related to the parish school, academy, or school campus events\n' +
    '  UNLESS it is a performance/concert open to the parish community\n' +
    '- Tuition assistance, scholarships, educational grants, school enrollment\n' +
    '- School locations (school, cemetery) as standalone listings\n' +
    '\n' +
    '## OTHER EXCLUSIONS\n' +
    '- Memory candles, memorial ads, sympathy acknowledgments\n' +
    '- Daylight saving time reminders — ANY mention of clocks changing, \"Spring forward\", ' +
    '\"Fall back\", or time change notices. These are NEVER events or notices. Skip completely.\n' +
    '- Recruitment ads and sign-up drives — these are solicitations, NOT events. ' +
    'If the primary purpose is recruiting participants (\"We need students to join\", ' +
    '\"Sign up now\", \"Volunteers needed\", \"Join our team\"), skip it entirely. ' +
    'A performance/play is only an event if it lists a DATE and TIME for the audience to ATTEND — ' +
    'a call for cast sign-ups is recruitment, not an event.\n' +
    '- Facility updates (new heater, AC, renovations)\n' +
    '- General donation solicitations ("we need baby items", "school supplies needed")\n' +
    '- Lists of people baptized, confirmed, or received into the church\n' +
    '- Paid advertisements and sponsor ads\n' +
    '- Publisher branding (LPi, Diocesan, etc.), copyright notices\n' +
    '- Events held outside MA, CT, NH, or VT (e.g., "March for Life in Washington DC")\n' +
    '- "Save the Date" items with only a title and date but no other details\n' +
    '\n' +
    '# HANDLING DUPLICATES\n' +
    'Bulletins often mention the same item multiple times (brief teaser on one page, ' +
    'full details on another). Extract each item ONCE per page with the most complete details ' +
    'available. If a brief mention adds nothing beyond what a fuller listing provides, skip it.\n' +
    '\n' +
    'For recurring services listed as individual days ("Monday 7AM Mass, Tuesday 7AM Mass"), ' +
    'recognize these as the recurring schedule. Set recurring: "weekly", do NOT create ' +
    'separate one-time items for each day.\n' +
    '\n' +
    'If the same schedule appears twice on a page in different formats (e.g., a compact schedule ' +
    'block AND a longer descriptive section), extract it ONCE using the most structured version. ' +
    'Do NOT extract both.\n' +
    '\n' +
    '# CROSS-PARISH EVENTS\n' +
    'If an event is hosted by a DIFFERENT church than ' + churchName + ', ' +
    'still extract it but set the `host_parish` field to the hosting church\'s name. ' +
    'This includes cluster parish events, diocesan events, and deanery events ' +
    'as long as they occur within MA, CT, NH, or VT.\n' +
    '\n' +
    '# HOLY DAY MASS LISTINGS\n' +
    'Many bulletins list generic Holy Day of Obligation Mass times (e.g., "Holy Day Vigil 6pm, ' +
    'Holy Day 8:30am, 12:05pm, 6pm"). These are informational — they tell parishioners what times ' +
    'would be used IF a holy day occurs, but they are not a specific upcoming event. ' +
    'Do NOT extract these. They are general policy, not scheduled services.\n' +
    '\n' +
    '# SATURDAY MORNING MASS (CRITICAL)\n' +
    'A Saturday morning Mass (e.g., Saturday 9:00 AM) does NOT fulfill the Sunday obligation. ' +
    'It is a weekday/daily Mass that happens to fall on Saturday. Only Saturday ' +
    'Masses at 2:00 PM or later are Vigil Masses fulfilling Sunday obligation.\n' +
    'TITLE RULE: Saturday Mass before 2:00 PM → title "Daily Mass". ' +
    'Saturday Mass at 2:00 PM or later → title "Vigil Mass". ' +
    'NEVER title a Saturday morning Mass as "Sunday Mass" or "Weekend Mass".\n' +
    '\n' +
    '# MASS SCHEDULE — INDIVIDUAL ITEMS (CRITICAL)\n' +
    'When extracting the regular Mass schedule, create ONE SEPARATE ITEM PER INDIVIDUAL MASS TIME. ' +
    'Do NOT combine all Mass times into a single blob item like "Schedule of Holy Mass" or ' +
    '"Weekend Masses" with multiple times in the description.\n' +
    'For example, if the schedule shows:\n' +
    '  Saturday: 9:00 AM, 4:00 PM\n' +
    '  Sunday: 7:30 AM, 9:00 AM, 11:00 AM\n' +
    'Extract 5 separate service items:\n' +
    '  1. "Daily Mass" — day: "saturday", time: 09:00, recurring: weekly\n' +
    '  2. "Vigil Mass" — day: "saturday", time: 16:00, recurring: weekly\n' +
    '  3. "Sunday Mass" — day: "sunday", time: 07:30, recurring: weekly\n' +
    '  4. "Sunday Mass" — day: "sunday", time: 09:00, recurring: weekly\n' +
    '  5. "Sunday Mass" — day: "sunday", time: 11:00, recurring: weekly\n' +
    'Also populate the mass_schedule array with corresponding entries.\n' +
    'Weekday Masses should also be split: if "Mon-Fri 9:00 AM" appears, that is ONE item ' +
    'with title "Daily Mass", day: "weekday", time 09:00, recurring: weekly. ' +
    'But if separate days have different times, create separate items with individual day values.\n' +
    '\n' +
    '# PRAYER TIMES\n' +
    'Morning Prayer, Evening Prayer, Liturgy of the Hours → category "vespers".\n' +
    'Structured prayer groups with a scheduled time → category "prayer_group".\n' +
    'Other scheduled prayer times that don\'t fit specific categories → category "devotion".\n' +
    '\n' +
    '# COMMUNION SERVICES\n' +
    'Communion Services (no consecration, just distribution) are category "communion_service" — ' +
    'NOT "mass". They belong in the schedule but are a distinct service type.\n' +
    '\n' +
    '# VOLUNTEER EVENTS\n' +
    'Volunteer/service events that take place AT the parish (e.g., "make sandwiches in the ' +
    'Parish Center") should be extracted. Events at external locations (e.g., "volunteer at ' +
    'Goodwill shelter downtown") should be excluded — we only track what happens at or is ' +
    'organized by the parish itself.\n' +
    '\n' +
    '# BENEDICTION NOTE\n' +
    'If Benediction is paired with Adoration (e.g., "Adoration 3-5 PM, Benediction at 5 PM"), ' +
    'extract ONE adoration item with end_time 17:00 and note "concludes with Benediction" in original_text.\n' +
    'If Benediction is listed as a standalone service with its own time slot (not attached to adoration), ' +
    'use category "benediction".\n' +
    '\n' +
    '# EXPOSITION / PERPETUAL ADORATION\n' +
    '"Exposition of the Blessed Sacrament" = adoration. Treat identically.\n' +
    '"Perpetual Adoration" or 24/7 adoration: category "perpetual_adoration".\n' +
    'Extended-hours adoration that is NOT truly 24/7 (e.g., 8 AM–11 PM): use "adoration" with times.\n' +
    '\n' +
    '# BILINGUAL SERVICES\n' +
    'If a service is bilingual (e.g., "Misa Bilingüe", "Bilingual Mass", "English/Polish"), ' +
    'set language to a comma-separated string: "es,en", "pl,en", etc. ' +
    'List the primary language first. Only set language when explicitly non-English — default is "en".\n' +
    '\n' +
    '# FIRST FRIDAY / FIRST SATURDAY\n' +
    'First Friday and First Saturday devotions carry special devotional significance ' +
    '(Sacred Heart / Immaculate Heart). When you see "First Friday Mass", "First Friday Adoration", etc.:\n' +
    '- Use the actual service category (mass, adoration, confession, rosary, etc.) — NOT a generic category.\n' +
    '- Set recurring: "monthly".\n' +
    '- Add a tag: "first_friday" or "first_saturday" to preserve the nth-week context.\n' +
    '- The title should include "First Friday" or "First Saturday" (e.g., "First Friday Mass").\n' +
    '\n' +
    '# NTH-WEEK RECURRING PATTERNS\n' +
    'For services that occur on a specific week of the month (e.g., "2nd Tuesday Rosary", ' +
    '"3rd Wednesday Bible Study"), set recurring: "monthly" and add a tag like ' +
    '"2nd_tuesday", "3rd_wednesday" to preserve which week. This helps the export process.\n' +
    '\n' +
    '# POLISH PARISH SERVICES\n' +
    'Polish parishes may have these culturally specific services:\n' +
    '- Gorzkie Żale (Bitter Lamentations): Lenten Sundays, usually 2-3 PM → category "gorzkie_zale", seasonal "lent"\n' +
    '- Droga Krzyżowa: Polish Stations of the Cross → category "stations_of_cross", note bilingual in original_text\n' +
    '- Swieconka / food blessing: Holy Saturday, often multiple time slots → category "blessing"\n' +
    '\n' +
    '# PORTUGUESE PARISH SERVICES\n' +
    'Portuguese parishes may have:\n' +
    '- Via Sacra: Portuguese Stations of the Cross → category "stations_of_cross"\n' +
    '- Bilingual Lenten services → set language to "pt,en"\n' +
    '\n' +
    '# DAY FIELD (CRITICAL FOR SERVICES)\n' +
    'Every service item MUST have a `day` field indicating when it occurs. ' +
    'Valid values: ' + DAYS.join(', ') + '.\n' +
    'RULES:\n' +
    '- Use the specific day of the week (monday, tuesday, etc.) when the bulletin specifies one.\n' +
    '- Use "weekday" ONLY when Mon-Fri are identical (same time, same location, same language). ' +
    'If Friday differs from Mon-Thu, use 4 individual items (monday-thursday) + 1 friday item.\n' +
    '- Use "daily" ONLY when all 7 days are identical.\n' +
    '- Saturday Mass before 2:00 PM → day: "saturday" (it is a daily_mass on Saturday).\n' +
    '- Saturday Mass at 2:00 PM or later → day: "saturday" (it is a vigil/sunday_mass on Saturday).\n' +
    '- First Friday / First Saturday → day: "first_friday" or "first_saturday" (these carry devotional significance).\n' +
    '- Holy Day Masses → day: "holyday" or "holyday_eve".\n' +
    '- Holy Week services use their specific day: "holy_thursday", "good_friday", "holy_saturday", ' +
    '"easter_vigil", "palm_sunday", "easter_sunday".\n' +
    '- For events with a specific date but no recurring day, set day to null and use event_date instead.\n' +
    '- For "Mon-Fri 9:00 AM" → ONE item with day: "weekday".\n' +
    '- For "Mon-Sat 9:00 AM" → TWO items: one with day: "weekday", one with day: "saturday".\n' +
    '- For "Mon, Wed, Fri 9:00 AM" → THREE separate items with day: "monday", "wednesday", "friday".\n' +
    '\n' +
    '# OUTPUT FORMAT\n' +
    '{\n' +
    '  "items": [\n' +
    '    {\n' +
    '      "item_type": "<service|event|notice>",\n' +
    '      "original_text": "<COMPLETE verbatim text of this item as printed in the bulletin>",\n' +
    '      "category": "<from: ' + ALL_CATEGORIES.join('|') + '>",\n' +
    '      "title": "<the printed heading verbatim, or first meaningful phrase if no heading>",\n' +
    '      "event_date": "<YYYY-MM-DD or null>",\n' +
    '      "event_time": "<HH:MM 24hr or null>",\n' +
    '      "end_time": "<HH:MM 24hr or null>",\n' +
    '      "end_date": "<YYYY-MM-DD or null if same day>",\n' +
    '      "location": "<venue: Parish Hall, Church, Room 201, etc. or null>",\n' +
    '      "contact_name": "<if mentioned, else null>",\n' +
    '      "contact_phone": "<if mentioned, else null>",\n' +
    '      "contact_email": "<if mentioned, else null>",\n' +
    '      "registration_url": "<actual registration links only, else null>",\n' +
    '      "day": "<' + DAYS.join('|') + ' or null>",\n' +
    '      "recurring": "<weekly|monthly|one_time or null>",\n' +
    '      "seasonal": "<' + SEASONS.join('|') + ' or null>",\n' +
    '      "language": "<en|es|pl|pt|la|vi|fr or comma-separated for bilingual e.g. es,en — else null>",\n' +
    '      "host_parish": "<church name if hosted by a different parish, else null>",\n' +
    '      "tags": ["<relevant: fundraiser, seniors, families, youth, free, etc.>"],\n' +
    '      "confidence": <0.0-1.0>\n' +
    '    }\n' +
    '  ],\n' +
    '  "clergy": [\n' +
    '    {"role": "<pastor|administrator|co_pastor|rector|vice_rector|provisional_priest|pastoral_minister|parochial_vicar|deacon|deacon_emeritus|deacon_retired>", "name": "<full name>"}\n' +
    '  ],\n' +
    '  "mass_schedule": [\n' +
    '    {"day": "<saturday|sunday|weekday day name>", "time": "<HH:MM>", "notes": "<Vigil, etc.>"}\n' +
    '  ],\n' +
    '  "page_type": "<cover|schedule|events|announcements|ads|mixed>",\n' +
    '  "notes": "<any parsing difficulties or ambiguities>"\n' +
    '}\n' +
    '\n' +
    'RULES:\n' +
    '1. Return ONLY raw valid JSON. Do NOT wrap in ```json``` or any markdown. No preamble, no explanation. Start with { and end with }.\n' +
    '2. If the page has nothing to extract (ads, cover, boilerplate), return ' +
    '{"items": [], "clergy": [], "mass_schedule": [], "page_type": "ads", "notes": "..."}\n' +
    '3. Use null (not empty string) for missing fields.\n' +
    '4. Dates: YYYY-MM-DD. Current year is ' + new Date().getFullYear() + '.\n' +
    '5. Times: HH:MM in 24-hour format. If timing is relative ("after 8:30 AM Mass"), ' +
    'set event_time to null — do NOT guess. The relative timing is preserved in original_text.\n' +
    '6. Confidence: 1.0 = certain, 0.8+ = high, 0.5-0.8 = ambiguous, <0.5 = uncertain.\n' +
    '7. Use "general" ONLY as a last resort when no other category fits but the item ' +
    'clearly meets extraction criteria.\n' +
    '8. `original_text` must be COMPLETE and VERBATIM. Include all details the bulletin provides ' +
    '(menu items, what to bring, dress code, etc.) — everything the parish thought parishioners ' +
    'should know. Do NOT summarize or truncate.\n' +
    '9. `title` = the actual printed heading. Do NOT generate or rephrase.\n' +
    '10. `clergy`: Extract ONLY from page 1. Return at most TWO entries: ' +
    '(1) the highest-ranking priest (Pastor > Parochial Vicar > Administrator > first Priest listed) ' +
    'and (2) the FIRST active Deacon listed. Do NOT include multiple deacons. ' +
    'Skip anyone labeled retired, emeritus, or in residence. ' +
    'If no clergy visible on this page, return empty array.\n' +
    '11. `mass_schedule`: Extract ONLY from page 1 if a standard weekly schedule is displayed. ' +
    'If not visible on this page, return empty array.\n' +
    '12. Preserve original wording, abbreviations, and punctuation in `original_text`.';
}

module.exports = {
  buildPrompt: buildPrompt,
  SERVICE_CATEGORIES: SERVICE_CATEGORIES,
  EVENT_CATEGORIES: EVENT_CATEGORIES,
  NOTICE_CATEGORIES: NOTICE_CATEGORIES,
  ALL_CATEGORIES: ALL_CATEGORIES,
  SEASONS: SEASONS,
  DAYS: DAYS,
};
