# MassFinder — Catholic API Integration Technical Spec

**Document purpose:** Claude Code handoff spec for integrating external Catholic liturgical APIs into the MassFinder PWA.
**Date:** 2026-03-07
**Repo:** `github.com/monsballoon-hue/MassFinder.git` (dev branch)
**Deployment:** Vercel auto-deploy from GitHub main; Vercel team `mvadamski-7653s-projects`

---

## TABLE OF CONTENTS

1. [Current State — What Exists](#1-current-state)
2. [API #1 — Liturgical Calendar (LitCal)](#2-litcal-api)
3. [API #2 — BibleGet](#3-bibleget-api)
4. [API #3 — Supplementary Resources](#4-supplementary-resources)
5. [Implementation Phases](#5-implementation-phases)
6. [Code Locations & Touch Points](#6-code-locations)
7. [Service Worker Updates](#7-service-worker)
8. [CSS Variables & Design Tokens](#8-css-design)
9. [Testing & Validation](#9-testing)
10. [Constraints & Anti-Patterns](#10-constraints)

---

## 1. CURRENT STATE

### 1.1 Readings System (what exists today)

**Primary API:** `https://massfinder-readings-api.vercel.app/api/readings?date=YYYYMMDD`
- Python Vercel serverless function
- Scrapes USCCB via `catholic-mass-readings` Python package with Chrome TLS impersonation
- Returns: `{ title, url, sections: [{heading, ref, text}] }`
- 12-second timeout with AbortSignal
- Fallback: shows USCCB direct link only

**Reading text rendering (index.html):**
- `fetchReadings()` at line ~2395 — fetches and renders all readings
- `formatReadingText(raw, heading)` at line 2508 — dispatcher: psalm vs prose
- `formatPsalm(raw)` at line 2515 — parses refrain, stanzas, R. lines
- `formatReading(raw)` at line 2545 — parses verse numbers, intros, conclusions
- Text arrives as flat blob; `formatReading()` uses regex `line.match(/^(\d{1,3})\s+(.+)$/)` to detect verse numbers — **unreliable, misses inline verse numbers, no chapter:verse distinction**

**Current rendering CSS classes (index.html lines 552-661):**
```
.reading-heading    — section label (FIRST READING, GOSPEL, etc.)
.reading-ref        — reference (e.g., "Romans 8:31-39")
.reading-text       — container for expanded content
.reading-para       — paragraph within reading
.verse-num          — superscript verse number (line 656)
.psalm-refrain      — italic bold psalm response
.psalm-verse        — psalm stanza container
.psalm-verse-line   — individual psalm line
.reading-intro      — "A reading from..." italic
.reading-conclusion — "The Word of the Lord" uppercase
```

### 1.2 Saint of the Day Card (what exists today — BROKEN)

**`renderSaintFromTitle(title, now)`** at line ~2451:
- Receives the `data.title` string from the readings API
- Attempts to parse saint name via regex prefix matching against `rankPrefixes` array:
  `"Solemnity of"`, `"Feast of"`, `"Memorial of"`, `"Optional Memorial of"`
- Detects ordinary weekdays via regex: `/^(monday|tuesday|...|saturday)\s+(of\s+the|after)/i`
- On match: renders saint-card with name, rank label, date, and Universalis links
- On no match or readings API failure: **falls back to `renderSaintFallback()`** — a plain "See today's feast day at Universalis" link

**Why it fails:**
- Readings API title format is inconsistent
- Many days don't start with rank prefixes (e.g., "Saturday of the 2nd Week of Lent")
- No structured saint data; entirely dependent on string parsing of someone else's title

**Saint card HTML element:** `<div id="saintOfDayCard">` at line 777
**CSS classes (lines 647-653):** `.saint-card`, `.saint-feast`, `.saint-name`, `.saint-subtitle`, `.saint-links`, `.saint-source`

---

## 2. LITCAL API

### 2.1 Overview

**Name:** Liturgical Calendar API
**Author:** Fr. John Romano D'Orazio (Diocese of Rome) + contributors
**License:** Open source
**Maintainer community:** Includes ConfessIt author (Mike Kasberg), St. Isidore Guild for Catholic IT Professionals
**Website:** https://litcal.johnromanodorazio.com/
**GitHub org:** https://github.com/Liturgical-Calendar/
**API repo:** https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI
**Frontend repo:** https://github.com/Liturgical-Calendar/LiturgicalCalendarFrontend
**OpenAPI docs:** https://litcal.johnromanodorazio.com/dist/
**MCP server:** `liturgical-calendar-mcp` exists in the community (referenced in awesome-catholic)

### 2.2 Endpoint

```
GET https://litcal.johnromanodorazio.com/api/v5/calendar/nation/US/{YEAR}
Accept: application/json
```

**IMPORTANT:** v4 returns 404. Use **v5** only.

**Auth:** None required. CORS-enabled. No API key.

**Parameters:**
- `{YEAR}` — 4-digit year (e.g., `2026`). Omit for current year.
- Path `/nation/US` — returns US national calendar with USCCB-specific saints (St. John Neumann, Bl. Kateri Tekakwitha, etc.) and US holy days of obligation settings
- No query params needed for MassFinder's use case — US defaults are correct

**ICS endpoint (calendar subscription):**
```
GET https://litcal.johnromanodorazio.com/api/v5/calendar/nation/US?returntype=ICS
```
NOTE: As of testing, this endpoint returned JSON even with `returntype=ICS`. May need `Accept: text/calendar` header or different path. Verify before implementing ICS subscription feature.

### 2.3 Response Schema

**Top-level:** `{ litcal: [...events], settings: {...}, metadata: {...} }`

**`litcal` is an ARRAY** (not object) of event objects. 555 events for US 2026 liturgical year (Advent 2025 through Christ the King 2026).

**Single event object:**
```json
{
  "event_key": "StsPerpetuaFelicity",
  "event_idx": 168,
  "name": "Saints Perpetua and Felicity, Martyrs",
  "color": ["red"],
  "color_lcl": ["red"],
  "grade": 1,
  "grade_lcl": "commemoration",
  "grade_abbr": "m*",
  "grade_display": null,
  "common": ["Proper"],
  "common_lcl": "Proper",
  "type": "fixed",
  "date": "2026-03-07T00:00:00+00:00",
  "year": 2026,
  "month": 3,
  "month_short": "Mar",
  "month_long": "March",
  "day": 7,
  "day_of_the_week_iso8601": 6,
  "day_of_the_week_short": "Sat",
  "day_of_the_week_long": "Saturday",
  "readings": {
    "first_reading": "Romans 8:31b-39",
    "responsorial_psalm": "Psalm 124",
    "gospel_acclamation": "Matthew 5:10",
    "gospel": "Matthew 10:34-39"
  },
  "psalter_week": 2,
  "liturgical_season": "LENT",
  "liturgical_season_lcl": "Lent"
}
```

**Optional fields (present on some events):**
- `liturgical_year`: `"YEAR A"` or `"YEAR II"` — on Sundays/seasons
- `is_vigil_mass`: `true` — Saturday vigil entries
- `is_vigil_for`: `"Lent3"` — which Sunday this vigil belongs to
- `has_vigil_mass`: `true` — on Sunday entries that have a vigil
- `has_vesper_i` / `has_vesper_ii`: boolean
- `holy_day_of_obligation`: `true` — on obligatory feasts
- `grade_display`: alternate display label (e.g., `"National Day of Prayer"`)

### 2.4 Grade Hierarchy (numeric `grade` field)

```
0  = weekday
1  = commemoration (during Lent, replaces optional memorial)
2  = optional memorial
3  = Memorial (obligatory)
4  = FEAST
5  = FEAST OF THE LORD (includes Sundays)
6  = SOLEMNITY
7  = celebration with precedence over solemnities (Easter, Christmas, Triduum, Sundays of Advent/Lent/Easter)
```

**Grade distribution for US 2026:**
- weekday: 218
- optional memorial: 114
- Memorial: 62
- FEAST OF THE LORD: 61 (includes all Sundays)
- celebration with precedence over solemnities: 56
- SOLEMNITY: 21
- FEAST: 13
- commemoration: 10

### 2.5 Color Values

Always an array: `["purple"]`, `["white"]`, `["red"]`, `["green"]`, `["rose", "purple"]`

**Map to MassFinder CSS:**
```
purple  → #6B21A8 (or var(--color-lent) if defined)
white   → #F8FAFC (warm white)
red     → #DC2626
green   → #16A34A
rose    → #DB2777
gold    → #D97706 (not in LitCal but useful for solemnities)
```

### 2.6 Multiple Events Per Day

A single date can have **multiple events**. Example, March 7, 2026:
1. `LentWeekday2Saturday` (grade 0, weekday)
2. `StsPerpetuaFelicity` (grade 1, commemoration — saint)
3. `Lent3_vigil` (grade 7, Sunday vigil)

**Filtering logic for saint card:**
- Filter OUT events where `is_vigil_mass === true` (vigils are duplicates of Sunday)
- Filter OUT plain weekday events (grade 0) unless no saint/feast exists
- Pick highest-grade remaining saint/feast event
- If all remaining are grade 0 weekdays, show the weekday name + season

### 2.7 Readings References in LitCal

The `readings` object contains **Scripture references as strings** (not full text):
```json
"readings": {
  "first_reading": "Romans 8:31b-39",
  "responsorial_psalm": "Psalm 124",
  "second_reading": "Romans 4:13,16-18,22",
  "gospel_acclamation": "Matthew 5:10",
  "gospel": "Matthew 10:34-39"
}
```

**Important edge cases:**
- Alternate readings use `|` delimiter: `"Matthew 1:16,18-21,24a|Luke 2:41-51a"`
- Sub-verse selectors: `"Romans 8:31b-39"`, `"Genesis 3:9-15, 20"`, `"2 Samuel 7:4-5a,12-14a,16"`
- Some events have empty string readings (no proper readings assigned in the API for that event)
- Easter Vigil has unique structure: `seventh_reading`, `responsorial_psalm_7`, `epistle`, etc.
- Christmas/All Souls have `night`/`dawn`/`day` or `schema_one`/`schema_two`/`schema_three` nested objects
- Some events have `readings` as a plain string: `"From the Common of the Blessed Virgin Mary"`

**These reading references are the bridge to BibleGet** — take the reference, convert to BibleGet notation, fetch verse-by-verse text.

---

## 3. BIBLEGET API

### 3.1 Overview

**Name:** BibleGet I/O
**Author:** Fr. John Romano D'Orazio (same as LitCal)
**Website:** https://query.bibleget.io/
**API version:** v3
**License:** Open source
**Auth:** None required. CORS-enabled. No API key.

### 3.2 Verse Lookup Endpoint

```
GET https://query.bibleget.io/v3/?query={REFERENCE}&version={VERSION}
Accept: application/json
```

**Parameters:**
- `query` — Scripture reference. Accepts BOTH notations:
  - European: `Mt5,1-12` (comma for chapter:verse, hyphen for range)
  - English: `Romans8:31-39` (colon for chapter:verse)
  - Both tested and working as of 2026-03-07
- `version` — Bible translation abbreviation (see below)

**Available Catholic translations (confirmed live):**
```
NABRE  — New American Bible Revised Edition (2011, English, Catholic canon)
         ★ PRIMARY — this is what's read at Mass in the US
DRB    — Douay-Rheims Bible (English, Catholic canon, traditional)
NVBSE  — Nova Vulgata Bibliorum Sacrorum Editio (Latin, Catholic canon)
VGCL   — Vulgata Clementina (Latin, Catholic canon, traditional)
BLPD   — Libro del Pueblo de Dios (Spanish, Catholic canon)
CEI2008 — Conferenza Episcopale Italiana (Italian, Catholic canon)
```

**Copyright note:** NABRE and BLPD are listed as `copyrightversions` — text is under copyright by the respective bishops' conferences. DRB, NVBSE, VGCL are public domain. Rendering in-app should include appropriate copyright attribution for NABRE.

### 3.3 Response Schema

```json
{
  "results": [
    {
      "testament": 2,
      "section": 0,
      "book": 52,
      "chapter": 8,
      "verse": "31",
      "text": " What then shall we say to this? If God is for us, who can be against us? ",
      "bookabbrev": "Rom",
      "booknum": 6,
      "univbooknum": 45,
      "version": "NABRE"
    }
  ],
  "errors": [],
  "info": {
    "ENDPOINT_VERSION": "3.0",
    "detectedNotation": "EUROPEAN",
    "bibleVersionsInfo": {
      "NABRE": "New American Bible - Revised Edition|2011|en|1|CATHOLIC|United States Conference of Catholic Bishops|"
    }
  }
}
```

### 3.4 Text Formatting Tags

**Prose passages** return clean text with occasional whitespace.

**Poetic passages** (Psalms, Beatitudes, Prophets) include formatting tags:
```
<pof>  — first line of poetic couplet (outdented)
<poi>  — indented line of poetic couplet
<po>   — standard poetic line
<sm>   — small caps (e.g., "L<sm>ORD</sm>" → "LORD")
```

**Example — Psalm 23:1 NABRE:**
```
A psalm of David.\n<pof>The L<sm>ORD</sm> is my shepherd;</pof>\n<poi>there is nothing I lack.</poi>
```

**Example — Matthew 5:3-4 NABRE (Beatitudes):**
```
<pof>"Blessed are the poor in spirit,</pof>\n<poi>for theirs is the kingdom of heaven.</poi>
```

**Example — Romans 8:31 NABRE (prose):**
```
 What then shall we say to this? If God is for us, who can be against us?
```

### 3.5 Reference Conversion (LitCal → BibleGet)

LitCal reading references need conversion to BibleGet query format.

**Book name mapping (common cases):**
```javascript
var BOOK_ABBREV_MAP = {
  // LitCal format → BibleGet query format
  'Genesis': 'Gen', 'Exodus': 'Ex', 'Leviticus': 'Lev', 'Numbers': 'Num',
  'Deuteronomy': 'Deut', 'Joshua': 'Josh', 'Judges': 'Judg', 'Ruth': 'Ruth',
  '1 Samuel': '1Sam', '2 Samuel': '2Sam', '1 Kings': '1Kgs', '2 Kings': '2Kgs',
  '1 Chronicles': '1Chr', '2 Chronicles': '2Chr', 'Ezra': 'Ezra', 'Nehemiah': 'Neh',
  'Tobit': 'Tob', 'Judith': 'Jdt', 'Esther': 'Est', '1 Maccabees': '1Macc',
  '2 Maccabees': '2Macc', 'Job': 'Job', 'Psalm': 'Ps', 'Proverbs': 'Prov',
  'Ecclesiastes': 'Eccl', 'Song of Songs': 'Song', 'Wisdom': 'Wis',
  'Sirach': 'Sir', 'Isaiah': 'Isa', 'Jeremiah': 'Jer', 'Lamentations': 'Lam',
  'Baruch': 'Bar', 'Ezekiel': 'Ezek', 'Daniel': 'Dan', 'Hosea': 'Hos',
  'Joel': 'Joel', 'Amos': 'Am', 'Obadiah': 'Ob', 'Jonah': 'Jon', 'Micah': 'Mic',
  'Nahum': 'Nah', 'Habakkuk': 'Hab', 'Zephaniah': 'Zep', 'Haggai': 'Hag',
  'Zechariah': 'Zech', 'Malachi': 'Mal',
  'Matthew': 'Mt', 'Mark': 'Mk', 'Marc': 'Mk', 'Luke': 'Lk', 'John': 'Jn',
  'Acts': 'Acts', 'Romans': 'Rom', '1 Corinthians': '1Cor', '2 Corinthians': '2Cor',
  'Galatians': 'Gal', 'Ephesians': 'Eph', 'Philippians': 'Phil', 'Colossians': 'Col',
  '1 Thessalonians': '1Thess', '2 Thessalonians': '2Thess',
  '1 Timothy': '1Tim', '2 Timothy': '2Tim', 'Titus': 'Titus', 'Philemon': 'Phlm',
  'Hebrews': 'Heb', 'James': 'Jas', '1 Peter': '1Pet', '2 Peter': '2Pet',
  '1 John': '1Jn', '2 John': '2Jn', '3 John': '3Jn', 'Jude': 'Jude',
  'Revelation': 'Rev'
};
```

**Conversion steps:**
1. Strip sub-verse letters: `"31b-39"` → `"31-39"` (BibleGet ignores letter suffixes)
2. Strip `"Cf. "` prefixes from gospel acclamation references
3. Handle `|` alternates: split and use first option (or let user choose)
4. Handle `;` multi-range: `"Romans 4:13,16-18,22"` — BibleGet accepts this natively
5. Handle Psalm numbering: LitCal sometimes uses `"Psalm 33 (34)"` — extract first number

**Edge case — LitCal typos:** The API contains occasional typos like `"Marc"` for `"Mark"`, `"Hewbrews"` for `"Hebrews"`, `"Proverbe"` for `"Proverbs"`. The book mapping should handle these.

### 3.6 Metadata Endpoint

```
GET https://query.bibleget.io/v3/metadata.php?query=bibleversions
Accept: application/json
```

Returns: `{ validversions: [...], copyrightversions: [...], validversions_fullname: {...} }`

---

## 4. SUPPLEMENTARY RESOURCES

### 4.1 Summa Theologica JSON

**Repo:** https://github.com/Jacob-Gray/summa.json
**Source:** Benziger Bros. 1947 edition (public domain in US)
**Format:** Structured JSON — 7 parts, each with questions → articles
**Size:** ~20MB for ALL.json; individual part files available
**Use case:** "Daily Wisdom" card — surface a short Aquinas excerpt matched to liturgical season

### 4.2 Catechism of the Catholic Church JSON

**Referenced in:** https://github.com/topics/catholic
**Use case:** CCC paragraph references in devotional guides, inline citations

### 4.3 Aquinas Opera Omnia

**Referenced in:** awesome-catholic list
**Format:** Bilingual Latin-English complete works
**Use case:** Long-term — Church Fathers daily reading feature

### 4.4 cpbjr/catholic-readings-api (GitHub Pages)

**Repo:** https://github.com/cpbjr/catholic-readings-api
**Endpoint pattern:** `https://cpbjr.github.io/catholic-readings-api/saints/{YEAR}/{MM-DD}.json`
**Status:** As of 2026-03-07, endpoints returned empty/404 for dates tested. May only have 2025 data pre-generated. **Monitor but do not depend on.**
**Potential:** If populated, provides saint `name`, `type`, `quote`, and `wikipediaLink` per day.

### 4.5 church-calendar-api (calapi.inadiutorium.cz)

**Repo:** https://github.com/igneus/church-calendar-api
**Status:** Self-hosted by author, no SLA. Ruby/Grape app.
**Use case:** Backup/alternative to LitCal. Lower priority since LitCal has US national calendar built in.

---

## 5. IMPLEMENTATION PHASES

### Phase 1: Fix Saint Card via LitCal (PRIORITY — ship first)

**Goal:** Replace broken `renderSaintFromTitle()` regex parsing with authoritative LitCal API data.

**Implementation:**

1. **New function `fetchLiturgicalDay()`:**
   ```javascript
   // Fetch once at app load, cache for the day
   async function fetchLiturgicalDay() {
     var now = getNow();
     var year = now.getFullYear();
     var cacheKey = 'litcal-' + year;
     var cached = null;

     // Check in-memory cache (not localStorage — PWA constraint)
     if (window._litcalCache && window._litcalCache.year === year) {
       cached = window._litcalCache.events;
     }

     if (!cached) {
       try {
         var resp = await fetch(
           'https://litcal.johnromanodorazio.com/api/v5/calendar/nation/US/' + year,
           { signal: AbortSignal.timeout(10000) }
         );
         if (!resp.ok) throw new Error('LitCal ' + resp.status);
         var data = await resp.json();
         cached = data.litcal;
         window._litcalCache = { year: year, events: cached };
       } catch (e) {
         console.warn('LitCal fetch failed:', e);
         return null;
       }
     }

     // Filter to today's events
     var month = now.getMonth() + 1;
     var day = now.getDate();
     var todayEvents = cached.filter(function(evt) {
       return evt.month === month && evt.day === day;
     });

     return todayEvents;
   }
   ```

2. **New function `renderSaintCard(events)`:**
   - Filter out `is_vigil_mass === true` events
   - Sort remaining by `grade` descending
   - Find highest-grade saint/feast (grade >= 1, not a plain weekday)
   - Extract: `name`, `grade_lcl`, `color[0]`, `liturgical_season_lcl`, `readings`
   - If `holy_day_of_obligation === true`, add HDO badge
   - Render saint-card with liturgical color accent

3. **Replace in `fetchReadings()`:**
   - Remove `if(data.title) renderSaintFromTitle(data.title, now);` (line ~2421)
   - Call `fetchLiturgicalDay()` independently, not chained to readings API
   - Saint card renders even if readings API fails

4. **Replace `isLentSeason()` / `getEaster()` hand-rolled functions:**
   - Use `liturgical_season` field from LitCal cached data
   - Map: `LENT`, `ADVENT`, `CHRISTMAS`, `EASTER`, `EASTER_TRIDUUM`, `ORDINARY_TIME`

5. **Add liturgical color accent to saint card:**
   ```css
   .saint-card[data-color="purple"] { border-left-color: #6B21A8; }
   .saint-card[data-color="red"]    { border-left-color: #DC2626; }
   .saint-card[data-color="white"]  { border-left-color: #94A3B8; }
   .saint-card[data-color="green"]  { border-left-color: #16A34A; }
   .saint-card[data-color="rose"]   { border-left-color: #DB2777; }
   ```

**Universalis links:** Keep the existing "About today" and "Readings" Universalis links as secondary actions — they provide saint biographies that LitCal doesn't.

**Estimated changes:** ~80 lines new JS, ~15 lines new CSS, ~20 lines removed from old code.

---

### Phase 2: Bible-Formatted Readings via BibleGet

**Goal:** Replace flat text blobs with verse-by-verse NABRE text with superscript chapter:verse numbers and proper poetic formatting.

**Architecture decision — two options:**

**Option A (recommended): BibleGet as enhancement layer**
- Keep existing readings API as the **structure source** (it tells us which sections exist today: First Reading, Psalm, Gospel, etc.)
- For each section's `ref` field (e.g., "Romans 8:31-39"), make a BibleGet call to get verse-by-verse text
- If BibleGet fails, fall back to existing readings API flat text
- Pros: preserves existing section headings, psalm refrain handling, intro/conclusion lines
- Cons: N+1 API calls per page load (1 readings API + 1 BibleGet per section)

**Option B: LitCal refs → BibleGet directly**
- Use LitCal's `readings` object to get references per day
- Skip the readings API entirely
- Pros: eliminates dependency on the USCCB scraper
- Cons: LitCal has many empty reading references; no section headings; no psalm refrains; no "A reading from..." intros

**Recommended: Option A for now.** The readings API provides the section structure and psalm refrains that BibleGet doesn't. Use BibleGet only to replace the flat `text` field with verse-structured text.

**Implementation:**

1. **New function `fetchBibleGetVerses(ref, version)`:**
   ```javascript
   // ref = "Romans 8:31-39" (from readings API section.ref)
   // version = "NABRE" (default)
   async function fetchBibleGetVerses(ref, version) {
     if (!ref) return null;
     version = version || 'NABRE';
     var query = convertRefToBibleGet(ref);
     if (!query) return null;

     try {
       var resp = await fetch(
         'https://query.bibleget.io/v3/?query=' + encodeURIComponent(query)
         + '&version=' + version,
         { signal: AbortSignal.timeout(8000) }
       );
       if (!resp.ok) throw new Error('BibleGet ' + resp.status);
       var data = await resp.json();
       if (data.errors && data.errors.length) {
         console.warn('BibleGet errors:', data.errors);
         return null;
       }
       return data.results; // array of {chapter, verse, text, bookabbrev}
     } catch (e) {
       console.warn('BibleGet failed for ' + ref + ':', e);
       return null;
     }
   }
   ```

2. **New function `convertRefToBibleGet(ref)`:**
   ```javascript
   // "Romans 8:31b-39" → "Rom8:31-39"
   // "1 Corinthians 9:16-19, 22-23" → "1Cor9:16-19,22-23"
   // "Psalm 122: 1-2, 3-4, 4-5, 6-7, 8-9" → "Ps122:1-9"
   function convertRefToBibleGet(ref) {
     if (!ref) return null;
     // Strip "Cf. " prefix
     ref = ref.replace(/^Cf\.\s+/i, '');
     // Handle alternate readings (take first)
     if (ref.indexOf('|') !== -1) ref = ref.split('|')[0];
     // Strip sub-verse letters (a, b, c, d after numbers)
     ref = ref.replace(/(\d+)[a-d]/g, '$1');
     // Handle parenthetical psalm numbering: "Psalm 33 (34)" → "Ps33"
     ref = ref.replace(/\((\d+)\)/g, '');
     // Map book name
     var bookMatch = ref.match(/^(\d?\s*[A-Za-z]+)\s+/);
     if (!bookMatch) return ref; // return as-is if no match
     var bookName = bookMatch[1].trim();
     var remainder = ref.slice(bookMatch[0].length).trim();
     // Remove extra spaces
     remainder = remainder.replace(/\s+/g, '');
     var abbrev = BOOK_ABBREV_MAP[bookName] || bookName;
     return abbrev + remainder;
   }
   ```

3. **New function `renderBibleVerses(verses, isPsalm)`:**
   ```javascript
   // verses = BibleGet results array
   // Returns HTML with superscript verse numbers and poetic tags
   function renderBibleVerses(verses, isPsalm) {
     if (!verses || !verses.length) return '';
     return verses.map(function(v) {
       var text = v.text;
       // Strip BibleGet formatting tags, convert to our CSS classes
       text = text.replace(/<pof>/g, '<span class="verse-poetic-first">');
       text = text.replace(/<\/pof>/g, '</span>');
       text = text.replace(/<poi>/g, '<span class="verse-poetic-indent">');
       text = text.replace(/<\/poi>/g, '</span>');
       text = text.replace(/<po>/g, '<span class="verse-poetic">');
       text = text.replace(/<\/po>/g, '</span>');
       text = text.replace(/<sm>/g, '<span class="small-caps">');
       text = text.replace(/<\/sm>/g, '</span>');
       // Remove newlines between tags (BibleGet uses \n between poetic lines)
       text = text.replace(/\n/g, '');
       text = text.trim();

       return '<span class="bible-verse">'
         + '<span class="verse-num">' + esc(v.chapter + ':' + v.verse) + '</span>'
         + text
         + '</span>';
     }).join('');
   }
   ```

4. **New CSS classes:**
   ```css
   .bible-verse { display: inline; }
   .verse-num { font-size: 0.7em; font-weight: var(--weight-semibold);
     color: var(--color-accent-text); vertical-align: super; line-height: 0;
     margin-right: 2px; margin-left: 4px; }
   .verse-num:first-child { margin-left: 0; }
   .verse-poetic-first { display: block; margin-top: var(--space-2); }
   .verse-poetic-indent { display: block; padding-left: var(--space-5); }
   .verse-poetic { display: block; margin-top: var(--space-1); }
   .small-caps { font-variant: small-caps; }
   ```

5. **Integration in `fetchReadings()`:**
   - After receiving sections from readings API, for each section with `ref` AND `text`:
   - Call `fetchBibleGetVerses(section.ref, 'NABRE')`
   - If BibleGet returns results, render with `renderBibleVerses()` instead of `formatReadingText()`
   - If BibleGet fails, fall back to existing `formatReadingText(section.text, section.heading)`
   - Psalm sections: use BibleGet for verses but keep readings API's refrain (`R. ...`) line

**NABRE copyright notice** (add below readings section):
```html
<div class="reading-copyright">Scripture texts from the New American Bible, Revised Edition
© 2010, 1991, 1986, 1970 Confraternity of Christian Doctrine, Washington, D.C.</div>
```

**Estimated changes:** ~120 lines new JS, ~30 lines new CSS, ~10 lines modified in existing `fetchReadings()`.

---

### Phase 3: Liturgical Calendar ICS Subscription

**Goal:** "Subscribe to Liturgical Calendar" button in More tab.

**Implementation:** Simple — generate the ICS URL and offer it to the user's calendar app.

```javascript
function subscribeLiturgicalCalendar() {
  var icsUrl = 'https://litcal.johnromanodorazio.com/api/v5/calendar/nation/US?returntype=ICS';
  // Use same three-tier approach as YC events iCal export
  if (navigator.share) {
    navigator.share({ title: 'Catholic Liturgical Calendar', url: icsUrl });
  } else {
    window.open(icsUrl, '_blank');
  }
}
```

**NOTE:** ICS output needs verification — testing showed JSON returned even with `returntype=ICS`. May need to use the `Accept: text/calendar` header or a different URL structure. Test before shipping.

**Estimated changes:** ~20 lines JS, one button in More tab HTML.

---

### Phase 4: Daily Wisdom Content (future, lower priority)

**Goal:** "Daily Reflection" card with excerpt from Summa Theologica or CCC, matched to liturgical season.

**Approach:**
- Pre-build a curated JSON mapping: `{ season: "LENT", excerpts: [{source, question, article, text_snippet}] }`
- Ship as static JSON alongside `parish_data.json`
- On app load, pick a random excerpt matching current `liturgical_season` from LitCal
- Display in a card similar to the devotional guides section

**Not yet specced — requires content curation before implementation.**

---

## 6. CODE LOCATIONS & TOUCH POINTS

### Files to modify:

**`index.html`** (single-file PWA):
- Line ~777: `<div id="saintOfDayCard">` — saint card container
- Lines ~2395-2445: `fetchReadings()` — add LitCal call, BibleGet integration
- Lines ~2451-2500: `renderSaintFromTitle()` / `renderSaintFallback()` — REPLACE entirely
- Lines ~2508-2570: `formatReadingText()` / `formatPsalm()` / `formatReading()` — keep as fallback
- Lines 552-661: CSS for readings and saint card — add new classes
- Lines 46-53 of `sw.js`: `NETWORK_ONLY_HOSTS` array — add new API hosts

### Files NOT to modify:
- `parish_data.json` — no changes needed
- `parish_data.schema.json` — no changes needed
- `scripts/bulletin-parser/*` — completely separate system
- `MassFinder_V2_Build_Plan.md` — explicitly excluded from all context

---

## 7. SERVICE WORKER UPDATES

**File:** `sw.js`

**Current `NETWORK_ONLY_HOSTS` (line 46-53):**
```javascript
const NETWORK_ONLY_HOSTS = [
  'massfinder-readings-api.vercel.app',
  'api.web3forms.com',
  'www.googletagmanager.com',
  'www.google-analytics.com',
  'universalis.com',
  'mgbhmwnaipopdctbihmf.supabase.co',
];
```

**Add these hosts:**
```javascript
'litcal.johnromanodorazio.com',
'query.bibleget.io',
```

**Cache versioning:** Increment cache name (e.g., `massfinder-v5`) on deployment to ensure all devices pick up new code. Desktop Chrome incognito is ground truth for testing.

---

## 8. CSS DESIGN TOKENS

Use existing MassFinder design system variables. New classes should reference:

```css
--font-display     /* Heading font */
--font-body        /* Body font */
--text-xs / --text-sm / --text-base / --text-xl  /* Font sizes */
--weight-regular / --weight-medium / --weight-semibold  /* Font weights */
--color-text-primary / --color-text-secondary / --color-text-tertiary
--color-surface / --color-border-light
--color-accent / --color-accent-text
--color-info / --color-info-bg
--space-1 through --space-5  /* Spacing scale */
--radius-md  /* Border radius */
--shadow-card  /* Card shadow */
```

**Apple design principles apply:** Progressive disclosure, clean hierarchy, no clutter. The saint card and readings should feel native to the existing UI, not bolted on.

---

## 9. TESTING & VALIDATION

### API reliability testing:

1. **LitCal:** Fetch US 2026 calendar, verify 555 events returned, verify today's date has expected events
2. **BibleGet:** Test these edge cases:
   - Prose: `Rom8:31-39` (NABRE) — clean text, no formatting tags
   - Psalm: `Ps23:1-6` (NABRE) — poetic tags `<pof>`, `<poi>`, `<sm>`
   - Multi-range: `1Cor9:16-19,22-23` (NABRE) — discontinuous verses
   - Beatitudes: `Mt5:3-12` (NABRE) — poetic formatting
   - DRB: `Mt5:3-6` (DRB) — different translation, clean text
3. **Fallback:** Disconnect from network, verify readings API fallback still works, saint card shows graceful fallback

### Cross-device testing:
- Desktop Safari/Chrome (normal + incognito)
- Mobile Safari/Chrome
- Installed PWA
- Hard refresh + service worker cache versioning

---

## 10. CONSTRAINTS & ANTI-PATTERNS

### Hard constraints:
- **Node.js v12** on dev machine — no `??`, `?.`, `for...of` in scripts, no arrow functions in inline HTML event handlers. Use `var`, traditional `function`, and `||` fallback pattern.
- **Single-file PWA** — all JS in `index.html`, no build tools, no frameworks
- **No localStorage/sessionStorage** in artifacts (but `index.html` is deployed to Vercel, not rendered as an artifact — standard browser APIs are fine in the actual app)
- **Service worker cache-first** — always version cache name on deploy
- **Budget:** These APIs are free. No cost concern. But minimize API calls per page load.

### Anti-patterns to avoid:
- Don't replace the readings API entirely with BibleGet — the readings API provides section structure, psalm refrains, and intro/conclusion lines that BibleGet doesn't have
- Don't cache LitCal data in localStorage — use in-memory `window._litcalCache` (survives within session, refreshes on new day)
- Don't fetch the entire LitCal calendar on every page load if already cached for current year
- Don't render raw BibleGet HTML tags (`<pof>`, `<po>`, etc.) — convert to MassFinder CSS classes
- Don't hardcode liturgical season dates — always derive from LitCal API
- Don't assume LitCal readings references are always populated — many events have empty strings

### Rate limiting / courtesy:
- LitCal: No documented rate limits, but cache the full year response (555 events, ~300KB)
- BibleGet: No documented rate limits, but batch reading sections to minimize calls
- Both APIs are maintained by volunteers. Be respectful of server resources.

---

## APPENDIX A: QUICK REFERENCE CARD

```
┌─────────────────────────────────────────────────────────────────┐
│ LitCal API                                                       │
│ Base:    https://litcal.johnromanodorazio.com/api/v5             │
│ US Cal:  /calendar/nation/US/2026                                │
│ Auth:    None                                                     │
│ Format:  JSON (Accept: application/json)                         │
│ Returns: { litcal: [...555 events], settings, metadata }         │
│ GitHub:  github.com/Liturgical-Calendar/LiturgicalCalendarAPI    │
├─────────────────────────────────────────────────────────────────┤
│ BibleGet API                                                      │
│ Base:    https://query.bibleget.io/v3/                           │
│ Query:   ?query=Rom8:31-39&version=NABRE                         │
│ Auth:    None                                                     │
│ Format:  JSON                                                     │
│ Returns: { results: [{chapter, verse, text, bookabbrev}] }       │
│ Versions: NABRE (primary), DRB, NVBSE, VGCL, BLPD               │
│ Meta:    /v3/metadata.php?query=bibleversions                    │
├─────────────────────────────────────────────────────────────────┤
│ Existing Readings API                                             │
│ Base:    https://massfinder-readings-api.vercel.app              │
│ Query:   /api/readings?date=YYYYMMDD                             │
│ Returns: { title, url, sections: [{heading, ref, text}] }       │
│ Status:  Keep as structure source + BibleGet fallback            │
├─────────────────────────────────────────────────────────────────┤
│ Service Worker Hosts to Add                                       │
│ litcal.johnromanodorazio.com                                     │
│ query.bibleget.io                                                │
├─────────────────────────────────────────────────────────────────┤
│ Priority Order                                                    │
│ 1. LitCal → Saint Card fix (broken today, highest impact)        │
│ 2. BibleGet → Formatted readings (biggest UX upgrade)            │
│ 3. ICS subscription (quick win)                                  │
│ 4. Daily wisdom / Summa content (future, needs curation)         │
└─────────────────────────────────────────────────────────────────┘
```
