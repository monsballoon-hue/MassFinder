# Batch 2: Bulletin Parsing Pipeline — Implementation Plan

**Status:** Ready for implementation
**Depends on:** Batch 1 (complete — Supabase, API routes, frontend, SW all deployed)
**Estimated cost at pilot scale (10 parishes):** ~$0.50/week
**Estimated cost at full scale (85 parishes):** ~$8–20/month

---

## What This Batch Delivers

A local Node.js pipeline that:
1. Fetches a parish bulletin PDF from its known URL
2. Converts each page to a PNG image
3. Sends each image to Claude Sonnet's vision API with a structured extraction prompt
4. Returns structured JSON: events, announcements, schedule changes, ministry items
5. Stores results in new Supabase tables (`bulletins`, `bulletin_items`)
6. Provides a simple CLI review flow for approving/correcting parsed items

This batch is **infrastructure only** — no frontend changes, no admin UI, no subscriptions. Those come in later batches. The goal is to prove the pipeline works, measure accuracy, and establish the weekly rhythm.

---

## Prerequisites

### Tools to install
```bash
brew install ghostscript    # PDF rendering engine (required by pdf2pic)
```

### npm packages to add
```bash
npm install pdf2pic @anthropic-ai/sdk
```

### Environment variables needed
```
ANTHROPIC_API_KEY=sk-ant-...   # Add to .env.local alongside Supabase creds
```

### Already in place
- Supabase project (`mgbhmwnaipopdctbihmf.supabase.co`) with churches/services/events tables
- Vercel deployment on `dev` branch
- `bulletin_url` field on churches table (85 of 119 churches have URLs)
- Node.js v12 on machine (scripts must avoid `?.` and `??` syntax)

---

## 10 Pilot Parishes

Selected for: validated data, 20+ services, domain diversity across 7 platforms.

| # | ID | Name | Town | Platform | URL Type |
|---|-----|------|------|----------|----------|
| 1 | parish_016 | St. Agnes Parish | Dalton | parishesonline.com | LPi web page |
| 2 | parish_017 | Our Lady of the Valley | Easthampton | parishesonline.com | LPi web page |
| 3 | parish_031 | Immaculate Conception | Indian Orchard | parishesonline.com | LPi web page |
| 4 | parish_037 | Our Lady of Fatima | Ludlow | church-bulletin.org | Church-bulletin page |
| 5 | parish_061 | Holy Name Parish | Springfield | church-bulletin.org | Church-bulletin page |
| 6 | parish_022 | Blessed Trinity | Greenfield | blessedtrinitygreenfield.org | Parish website |
| 7 | parish_035 | St. Mary's Parish | Longmeadow | stmarylong.org | Parish website |
| 8 | parish_053 | St. Joseph Parish | Shelburne Falls | stjosephparishma.com | Parish website |
| 9 | parish_072 | Our Lady of Czestochowa | Turners Falls | wordpress.com | WordPress blog |
| 10 | parish_093 | St. Michael Church | Brattleboro | stmichaelvt.com | Parish website |

**Platform coverage:** 3x parishesonline (LPi), 2x church-bulletin.org, 5x individual parish sites (including 1 WordPress). This mix tests the three main bulletin delivery patterns.

**Why these 10:** All have verified data (validated in our manual review pass), 20+ services each (complex enough to be representative), and active clergy records. If the parser works on these 7 different platforms, it will work on most of the remaining 75 parishes.

---

## Database Schema: Migration 002

New file: `supabase/migrations/002_bulletin_tables.sql`

```sql
-- ============================================================
-- Batch 2: Bulletin parsing tables
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- Bulletins: one row per parish per week
CREATE TABLE IF NOT EXISTS bulletins (
  id              SERIAL PRIMARY KEY,
  church_id       TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  bulletin_date   DATE NOT NULL,          -- the Sunday this bulletin is for
  source_url      TEXT,                   -- where the PDF was fetched
  source_domain   TEXT,                   -- parishesonline.com, church-bulletin.org, etc.
  page_count      INT,
  pdf_path        TEXT,                   -- Supabase Storage path (optional archival)
  status          TEXT DEFAULT 'pending', -- pending, parsed, reviewed, published
  parsed_at       TIMESTAMPTZ,
  reviewed_at     TIMESTAMPTZ,
  reviewed_by     TEXT,
  raw_extraction  JSONB,                  -- full Claude output before review
  parse_cost_usd  FLOAT,                 -- track API cost per bulletin
  parse_model     TEXT,                   -- claude-sonnet-4-5-20250514, etc.
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(church_id, bulletin_date)
);

CREATE INDEX idx_bulletins_church_id ON bulletins (church_id);
CREATE INDEX idx_bulletins_status ON bulletins (status);
CREATE INDEX idx_bulletins_date ON bulletins (bulletin_date);

-- Bulletin items: individual extracted entries
CREATE TABLE IF NOT EXISTS bulletin_items (
  id              SERIAL PRIMARY KEY,
  bulletin_id     INT NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  church_id       TEXT NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,          -- from taxonomy (see below)
  title           TEXT NOT NULL,
  description     TEXT,
  event_date      DATE,                   -- NULL for undated announcements
  event_time      TEXT,                   -- HH:MM 24hr
  end_time        TEXT,
  end_date        DATE,                   -- for multi-day events
  location        TEXT,                   -- "Parish Hall", "Room 201", etc.
  contact_name    TEXT,
  contact_phone   TEXT,
  contact_email   TEXT,
  registration_url TEXT,
  recurring       TEXT,                   -- weekly, monthly, one_time, or NULL
  tags            TEXT[],
  source_page     INT,                    -- which PDF page (1-indexed)
  confidence      FLOAT,                  -- Claude's self-reported 0.0-1.0
  is_new          BOOLEAN DEFAULT TRUE,   -- false if unchanged from prior week
  status          TEXT DEFAULT 'pending', -- pending, approved, rejected
  data            JSONB,                  -- overflow fields
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulletin_items_bulletin_id ON bulletin_items (bulletin_id);
CREATE INDEX idx_bulletin_items_church_id ON bulletin_items (church_id);
CREATE INDEX idx_bulletin_items_category ON bulletin_items (category);
CREATE INDEX idx_bulletin_items_status ON bulletin_items (status);
CREATE INDEX idx_bulletin_items_event_date ON bulletin_items (event_date);

-- Full-text search on bulletin items
CREATE INDEX idx_bulletin_items_search ON bulletin_items
  USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '')));

-- Parish profiles: per-parish context for prompt injection
CREATE TABLE IF NOT EXISTS parish_profiles (
  church_id           TEXT PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
  bulletin_publisher  TEXT,                -- lpi, diocesan, parish_website, wordpress
  typical_page_count  INT,
  page_layout_notes   TEXT,               -- "Page 2 is always pastor letter, page 3 events"
  known_recurring     TEXT[],             -- ["Fish Fry Fridays in Lent", "Rosary Tues 6:30 PM"]
  common_locations    TEXT[],             -- ["Parish Hall", "Mercy Center"]
  parsing_notes       TEXT,               -- any quirks for this parish's bulletins
  last_accuracy_pct   FLOAT,             -- rolling accuracy from reviews
  total_parsed        INT DEFAULT 0,
  total_corrections   INT DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: public read, service-role write
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE parish_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read bulletins" ON bulletins FOR SELECT USING (true);
CREATE POLICY "Public read bulletin_items" ON bulletin_items FOR SELECT USING (true);
CREATE POLICY "Public read parish_profiles" ON parish_profiles FOR SELECT USING (true);

-- Updated_at triggers
CREATE TRIGGER set_bulletins_updated_at
  BEFORE UPDATE ON bulletins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_bulletin_items_updated_at
  BEFORE UPDATE ON bulletin_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_parish_profiles_updated_at
  BEFORE UPDATE ON parish_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Item Taxonomy (34 categories)

```
SACRAMENTAL (9)
  mass_change, confession_change, adoration_change, baptism,
  first_communion, confirmation, marriage, anointing_of_sick, rcia

DEVOTIONAL (8)
  rosary, stations_of_cross, novena, holy_hour, benediction,
  divine_mercy, first_friday, first_saturday

EDUCATIONAL (8)
  bible_study, book_club, speaker_series, retreat, mission,
  faith_formation, adult_education, youth_group

SOCIAL (9)
  fish_fry, pancake_breakfast, potluck, dinner_dance, trivia_night,
  movie_night, game_night, picnic, festival

MINISTRY (12)
  choir, lector_training, emhc_training, altar_server, usher, greeter,
  bereavement, prayer_shawl, food_pantry, clothing_drive, blood_drive,
  habitat_for_humanity

ADMINISTRATIVE (8)
  parish_council, finance_council, annual_report, census,
  stewardship, building_fund, capital_campaign, office_hours_change

ANNOUNCEMENT (8)
  pastor_letter, staff_change, facility_update, weather_closure,
  thank_you, remembrance, milestone, general
```

Items that don't fit neatly use `general` with descriptive tags.

---

## Pipeline Architecture

### File structure
```
scripts/
  bulletin-parser/
    index.js              -- CLI entry point: fetch → convert → parse → store
    fetch-bulletin.js     -- Download PDF from bulletin_url (handles LPi, church-bulletin, direct)
    pdf-to-images.js      -- pdf2pic wrapper: PDF buffer → PNG buffers
    parse-page.js         -- Claude Vision API call per page image
    prompt.js             -- The extraction prompt (most important file)
    store-results.js      -- Insert into Supabase bulletins + bulletin_items
    diff-engine.js        -- Compare this week vs last week, flag new/changed
    review-cli.js         -- Terminal-based review: approve/edit/reject items
    config.js             -- Pilot parish list, model settings, thresholds
```

### Data flow
```
bulletin_url (from churches table)
  │
  ▼
fetch-bulletin.js ── GET URL ──→ PDF buffer (or HTML page with embedded PDF link)
  │
  ▼
pdf-to-images.js ── Ghostscript ──→ PNG buffers (200 DPI, ~1600x2100px)
  │
  ▼
parse-page.js ── Claude Sonnet Vision ──→ JSON per page
  │                                        { items: [...], page_type, notes }
  ▼
store-results.js ── Supabase insert ──→ bulletins + bulletin_items rows
  │
  ▼
diff-engine.js ── compare vs last week ──→ mark is_new: true/false
  │
  ▼
review-cli.js ── terminal UI ──→ approve/edit/reject → update status
```

---

## Phase-by-Phase Implementation

### Phase A: Setup & Infrastructure (1 session)

**What:** Install dependencies, create DB tables, scaffold the script directory.

1. `brew install ghostscript`
2. `npm install pdf2pic @anthropic-ai/sdk`
3. Add `ANTHROPIC_API_KEY` to `.env.local`
4. Run `002_bulletin_tables.sql` in Supabase SQL Editor
5. Create `scripts/bulletin-parser/` directory with config and shared utilities
6. Verify: `node -e "require('pdf2pic'); require('@anthropic-ai/sdk'); console.log('OK')"`

**Deliverable:** All dependencies installed, DB tables created, directory scaffolded.

### Phase B: Bulletin Fetcher (1 session)

**What:** Download bulletin PDFs from the 3 URL patterns we need to handle.

**Pattern 1 — LPi (parishesonline.com):**
The `bulletin_url` points to a web page like `https://parishesonline.com/organization/st-agnes-catholic-community-1226`. This page contains a link to the current bulletin PDF. We need to:
1. Fetch the HTML page
2. Scrape for the PDF link (look for `.pdf` href or known LPi embed patterns)
3. Download the actual PDF

**Pattern 2 — church-bulletin.org:**
URL like `https://church-bulletin.org/?id=928`. Similar pattern — web page with embedded/linked PDF.

**Pattern 3 — Direct parish sites:**
URLs like `https://www.stmarylong.org/bulletin`. These vary — some host PDFs directly, some embed via iframe, some use services like DiscoverMass or Issuu.

**Implementation approach:**
- For each URL, first do a HEAD request to check Content-Type
- If `application/pdf` → direct download, done
- If `text/html` → fetch page, look for PDF links in common patterns:
  - `<a href="...\.pdf">`
  - `<iframe src="...\.pdf">`
  - LPi-specific: `container.parishesonline.com/bulletins/...`
  - DiscoverMass: `discovermass.com/.../bulletin`
- Store the resolved PDF URL for future fetches (skip scraping next time if stable)

**Deliverable:** `fetch-bulletin.js` that takes a church record and returns a PDF buffer + resolved URL. Tested against all 10 pilot parishes.

### Phase C: PDF-to-Image Converter (1 session)

**What:** Convert PDF pages to PNG images suitable for Claude Vision.

```javascript
// pdf-to-images.js
var pdf2pic = require('pdf2pic');

function pdfToImages(pdfBuffer, options) {
  var converter = pdf2pic.fromBuffer(pdfBuffer, {
    density: 200,        // 200 DPI — balances quality vs token cost
    format: 'png',
    width: 1600,
    height: 2100,
    savePath: '/tmp'     // temp directory for intermediate files
  });

  // Convert up to 8 pages (most bulletins are 4-6)
  var pages = [];
  // ... sequential conversion, break when no more pages
  return pages;  // array of { buffer: Buffer, page: Number }
}
```

**Key decisions:**
- **200 DPI** (not 300): Reduces image size by ~44% vs 300 DPI while maintaining readability. Claude Vision handles 200 DPI well for typeset text. We can bump to 300 if accuracy is insufficient.
- **PNG format**: Lossless, better for text than JPEG.
- **1600x2100 pixels**: Standard letter page at 200 DPI. Large enough for Claude to read everything.

**Deliverable:** `pdf-to-images.js` that takes a PDF buffer and returns an array of PNG buffers. Tested with PDFs from all 10 pilots.

### Phase D: Claude Vision Parser (2 sessions)

**What:** The core — send page images to Claude, get structured JSON back.

**Session 1: Prompt engineering + initial implementation**

The extraction prompt is the most critical piece. Starting from the prompt in the Bulletin Platform Roadmap, refined for our specific needs:

```javascript
// prompt.js
function buildPrompt(churchName, churchTown, pageNumber, totalPages, parishProfile) {
  var context = '';
  if (parishProfile) {
    if (parishProfile.page_layout_notes) {
      context += '\nLayout notes: ' + parishProfile.page_layout_notes;
    }
    if (parishProfile.known_recurring && parishProfile.known_recurring.length) {
      context += '\nKnown recurring events: ' + parishProfile.known_recurring.join(', ');
    }
    if (parishProfile.common_locations && parishProfile.common_locations.length) {
      context += '\nCommon locations: ' + parishProfile.common_locations.join(', ');
    }
  }

  return 'You are parsing page ' + pageNumber + ' of ' + totalPages +
    ' of the weekly bulletin for ' + churchName + ' in ' + churchTown + '.' +
    context +
    '\n\nExtract ALL items of interest...' // (full prompt body — see below)
}
```

Full prompt body includes:
- What to extract (events, announcements, schedule changes, ministry items, social events, devotional activities, sacramental preparations, collection totals)
- What to ignore (ads, boilerplate, copyright, publisher branding, unchanged weekly schedule sidebar)
- JSON output schema with all fields from `bulletin_items` table
- Category taxonomy reference
- Confidence scoring instructions
- "Return ONLY valid JSON" directive

**Session 2: Testing, iteration, accuracy measurement**

Run the parser against all 10 pilot bulletins. For each:
1. Manually read the bulletin (or use the PDF viewer)
2. Note what items a human would extract
3. Compare against Claude's extraction
4. Calculate accuracy: correct items / (correct + missed + hallucinated)
5. Refine prompt based on error patterns

**Target: 90%+ accuracy on pilot set before proceeding.**

**Deliverable:** `parse-page.js` and `prompt.js`, tested and refined against 10 pilot bulletins with measured accuracy.

### Phase E: Storage & Diff Engine (1 session)

**What:** Store results in Supabase, detect what's new vs unchanged from last week.

**store-results.js:**
1. Upsert a `bulletins` row (church_id + bulletin_date unique)
2. Insert `bulletin_items` rows linked to the bulletin
3. Store raw extraction JSON in `bulletins.raw_extraction` for debugging
4. Track API cost per bulletin

**diff-engine.js:**
1. Fetch last week's `bulletin_items` for this church
2. For each new item, fuzzy-match against last week's items:
   - Same category + similar title (Levenshtein distance < 3) + same date → `is_new: false`
   - Everything else → `is_new: true`
3. Items in last week but NOT this week → flagged as potentially removed (don't auto-delete)

**Deliverable:** Items stored in Supabase with `is_new` flags. Verified by checking Supabase dashboard.

### Phase F: CLI Review Tool (1 session)

**What:** A terminal-based tool to approve, edit, or reject parsed items before they go live.

```
$ node scripts/bulletin-parser/review-cli.js

=== BULLETIN REVIEW ===
10 bulletins parsed, 47 items pending review

--- St. Agnes Parish, Dalton (6 items, 2 new) ---

[NEW] Fish Fry Friday
  Category: fish_fry | Date: 2026-03-13 | Time: 17:00-19:00
  Location: Parish Hall
  Description: Lenten fish fry, dine-in or take-out. Adults $12, children $6.
  Confidence: 0.97
  [A]pprove  [E]dit  [R]eject  [S]kip ?  _

[UNCHANGED] Rosary - Tuesday 6:30 PM
  Confidence: 0.98  (matched last week's item)
  [A]pprove  [S]kip ?  _
```

Features:
- Shows new items first, unchanged items second
- Color-coded confidence (green 0.9+, yellow 0.7-0.9, red <0.7)
- Batch-approve all unchanged items with `U` command
- Batch-approve all high-confidence (>0.95) new items with `H` command
- Edit mode opens item fields for inline correction
- Summary at end: "Approved 42, edited 3, rejected 2"

**Deliverable:** Working CLI review tool. This is a temporary bridge — the real review UI comes in Batch 3 (admin panel rebuild) with the side-by-side PDF | extracted data view.

### Phase G: End-to-End Pilot Run (1 session)

**What:** Run the full pipeline for all 10 parishes, review results, measure accuracy, document findings.

1. Run: `node scripts/bulletin-parser/index.js --pilot`
2. Review all items via CLI
3. Measure per-parish accuracy
4. Document:
   - Which platforms worked cleanly
   - Which needed special handling
   - Common extraction errors
   - Prompt refinements made
   - Actual API costs
5. Populate initial `parish_profiles` for the 10 pilots
6. Commit results and findings

**Success criteria:**
- All 10 bulletins fetched and parsed
- 90%+ extraction accuracy across the set
- <$1.00 total API cost for the run
- CLI review flow handles the full set in <15 minutes

**Deliverable:** Documented pilot results, accuracy metrics, cost data, and refined prompt.

---

## Bulletin Fetching: Platform-Specific Notes

### parishesonline.com (38 churches — largest group)
- URLs are web pages, not direct PDFs
- Current bulletin is typically linked from the organization page
- LPi may use JavaScript rendering — may need to check for API endpoints or predictable PDF URL patterns
- Fallback: Some LPi bulletins are at `container.parishesonline.com/bulletins/{ID}/{date}B.pdf` with a predictable date pattern

### church-bulletin.org (10 churches)
- URLs like `https://church-bulletin.org/?id=928`
- These are Diocesan-published bulletins
- Usually have a direct PDF download link on the page

### Individual parish websites (~31 churches)
- Most diverse group — each site is different
- Common patterns: `/bulletin`, `/bulletins`, `/weekly-bulletin`
- Many use DiscoverMass, Issuu, or direct PDF hosting
- Will need per-parish URL resolution logic for the first fetch, then cache the resolved PDF URL

### WordPress (1 church — chroniclesofczestochowa.wordpress.com)
- Blog-style bulletin posts with PDF attachments
- Fetch latest post in "weekly-bulletins" category, extract PDF link

### No bulletin URL (4 churches)
- Skip for now. Can be added manually later if bulletins are discovered.

---

## Cost Projections

### Per bulletin
| Component | Cost |
|-----------|------|
| Claude Sonnet vision: ~4 pages x ~1,500 input tokens (image) + ~800 output tokens | $0.02–0.06 |
| Supabase storage (if archiving PDFs): ~2 MB/bulletin | $0 (free tier) |

### Pilot (10 parishes/week)
- **$0.20–0.60/week** → ~$1–2.50/month

### Full scale (85 parishes/week)
- **$1.70–5.10/week** → ~$7–21/month
- With page-skip optimization (skip unchanged page 1): **$5–15/month**

### Cost tracking
Each `bulletins` row stores `parse_cost_usd` and `parse_model`. We can generate weekly cost reports:
```sql
SELECT date_trunc('week', parsed_at) as week,
       count(*) as bulletins,
       round(sum(parse_cost_usd)::numeric, 2) as total_cost
FROM bulletins
WHERE parsed_at IS NOT NULL
GROUP BY 1 ORDER BY 1 DESC;
```

---

## Error Handling

| Error | Handling |
|-------|----------|
| Bulletin URL returns 404 | Log warning, skip parish, mark bulletin as `fetch_failed` |
| Bulletin URL returns HTML (not PDF) | Try to extract PDF link from HTML; if not found, mark `fetch_failed` |
| Ghostscript/pdf2pic fails on PDF | Log error with PDF URL for manual investigation |
| Claude API rate limit | Exponential backoff, max 3 retries per page |
| Claude returns invalid JSON | Retry once with "Your previous response was not valid JSON. Return ONLY valid JSON." |
| Claude returns empty items | Store with `page_type: "ads"` or `"boilerplate"`, no items to review |
| Supabase insert fails | Log error, continue with next parish (don't let one failure stop the batch) |

---

## What This Batch Does NOT Include

These are explicitly deferred to later batches:

- **Admin panel / review UI** (Batch 3) — we use CLI review for now
- **Frontend bulletin browser** (Batch 4) — no changes to index.html
- **Automated weekly cron** (Batch 3) — pipeline runs manually via CLI
- **Email subscriptions** (Batch 5) — no subscriber system yet
- **Scaling to all 85 parishes** (Batch 3) — pilot is 10 only
- **Week-over-week diff prompting** (Phase G refinement) — basic diff via fuzzy matching only
- **Two-pass extraction** (future optimization) — single-pass for now

---

## Verification Checklist

After each phase:

- [ ] `node --check` passes on all new scripts
- [ ] No `?.` or `??` syntax (Node v12 compatibility)
- [ ] Scripts use `.env.local` for secrets (never hardcoded)
- [ ] Supabase tables created with proper RLS policies
- [ ] PDF conversion produces readable PNGs at 200 DPI
- [ ] Claude extraction returns valid JSON with all required fields
- [ ] Items stored in Supabase with correct foreign keys
- [ ] CLI review flow handles approve/edit/reject correctly
- [ ] Pilot run completes for all 10 parishes
- [ ] Accuracy measured and documented (target: 90%+)
- [ ] API costs tracked and within projections

---

## Session Plan

| Session | Phases | Deliverable |
|---------|--------|-------------|
| 1 | A + B | Dependencies installed, DB tables created, bulletin fetcher working for all 10 pilots |
| 2 | C + D (session 1) | PDF-to-image converter + initial Claude parser with extraction prompt |
| 3 | D (session 2) + E | Prompt refined from testing, storage + diff engine working |
| 4 | F + G | CLI review tool + full end-to-end pilot run with accuracy report |

4 sessions to complete Batch 2. Each session is self-contained and produces working, testable output.
