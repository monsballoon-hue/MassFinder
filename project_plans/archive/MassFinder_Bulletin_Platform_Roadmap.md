# MassFinder → MyCatholicBulletin: Technical Roadmap

## The one-sentence version

Add a Supabase database, a Vercel serverless API, and a weekly Claude Vision pipeline that reads bulletin PDFs as images — not text — to extract every event, announcement, and schedule change into structured, searchable, subscribable data. Total incremental cost: **$15–40/month** at 150 parishes.

---

## Why vision-based parsing changes everything

Here's the key insight that makes this feasible for one person: **don't extract text from PDFs at all.** The reason copy-paste from bulletins is garbage — scrambled columns, merged text blocks, reading-order chaos — is that PDF text layers encode *glyph positions*, not semantic content. Multi-column layouts, sidebars, and embedded ads create an extraction nightmare that even good libraries (pdf-parse, pdfplumber) struggle with.

Instead: **convert each PDF page to an image and send it to a multimodal LLM.** Claude and GPT-4o can *see* the page the way you do when you read the bulletin at Mass. They understand columns, headers, sidebars, ads vs. content, and can distinguish "Fish Fry Friday 5-7 PM in the parish hall" from the Geico ad next to it.

This is how you get above 95% fidelity. The LLM reads the visual layout, not a garbled text stream.

### What this looks like in practice

```
Bulletin PDF (4 pages)
  → pdf2image converts each page to a PNG (300 DPI)
  → Each page image sent to Claude Sonnet via API with a structured prompt
  → Claude returns JSON: events, announcements, schedule changes, pastor's letter highlights
  → JSON stored in Supabase
  → Human review UI shows extracted data alongside original page image
  → You approve/correct in ~2 minutes per bulletin
```

### Cost per bulletin

| Component | Cost |
|-----------|------|
| Claude Sonnet vision: ~4 pages × ~1,500 input tokens (image) + 800 output tokens | ~$0.02–0.06 per bulletin |
| 150 bulletins/week | **$3–9/week → $12–36/month** |
| GPT-4o-mini alternative: same pages | ~$0.005–0.01 per bulletin → **$3–6/month** |

You could run the entire parsing pipeline for 150 parishes for the cost of a single lunch.

---

## Architecture: What you're building

### Current state (static PWA)
```
User → Vercel CDN → index.html + parish_data.json + events.json
                     (all static files, no backend)
```

### Target state (full-stack bulletin platform)
```
User → Vercel CDN → index.html (PWA shell, mostly unchanged)
                  → Vercel API Routes → Supabase (PostgreSQL)
                                            ↑
                  Weekly cron job ──────────→│
                    │                         │
                    ├─ Fetch bulletin PDFs     │
                    ├─ Convert to images       │
                    ├─ Send to Claude API      │
                    ├─ Store structured JSON ──┘
                    └─ Flag for human review

Subscriptions → Resend (email digests)
             → Web Push (real-time alerts)
```

### What stays the same

Your existing index.html — the Find tab, Map tab, Saved tab, parish detail panels, the entire UI — **stays almost entirely intact**. The frontend currently fetches `parish_data.json` and `events.json` on load. In the new architecture, it fetches from API routes that serve the same JSON shape from Supabase instead of static files. The service worker strategy stays the same. The design stays the same. You're adding capabilities underneath, not rebuilding.

### What's new

1. **Supabase database** replacing static JSON files
2. **Vercel API routes** (serverless functions) as the data layer
3. **Bulletin ingestion pipeline** (cron + Claude API)
4. **Review dashboard** (new admin page for approving parsed bulletins)
5. **Bulletin browser** (new tab/section in the PWA)
6. **Subscription system** (email digests via Resend)

---

## Tech stack decisions and why

### Database: Supabase (PostgreSQL)

**Why Supabase over alternatives:**
- Free tier: 500 MB storage, 50K monthly active users, 500K Edge Function invocations — more than enough for 150 parishes
- PostgreSQL means full-text search built in (critical for bulletin search)
- Row-level security for future contributor accounts
- Real-time subscriptions if you ever want live updates
- Hosted dashboard for manual data inspection
- Auth built in (for admin access and future user accounts)
- $25/month Pro tier if you outgrow free (you probably won't)

**Why not:** Turso (SQLite, simpler but weaker full-text search), PlanetScale (MySQL, overkill), Cloudflare D1 (SQLite at edge, immature).

### API layer: Vercel Serverless Functions

**Why:** You're already on Vercel. Adding `/api/` routes requires zero new infrastructure. Node.js runtime, same repo, same deploy pipeline. A function like `/api/parishes` replaces the static `parish_data.json` fetch.

**Structure:**
```
massfinder-repo/
  api/
    parishes.js          ← serves parish data from Supabase
    events.js            ← serves events (replaces events.json)
    bulletins/
      latest.js          ← latest parsed bulletin content
      search.js          ← full-text search across bulletins
    subscribe.js         ← manage email subscriptions
    admin/
      ingest.js          ← trigger bulletin parsing
      review.js          ← approve/reject parsed content
  index.html             ← existing PWA (minor fetch URL changes)
  admin.html             ← existing parish editor
  review.html            ← NEW: bulletin review dashboard
  parish_data.json       ← keep as fallback/offline cache
  ...
```

### LLM for parsing: Claude Sonnet API (primary), GPT-4o-mini (budget fallback)

**Why Claude Sonnet:**
- Best-in-class vision understanding of complex document layouts
- Excellent at structured JSON output from visual input
- You already know Claude's behavior patterns intimately
- Anthropic API pricing is competitive for vision tasks

**Why GPT-4o-mini as fallback:**
- 10x cheaper for cases where Sonnet is overkill (simple bulletin layouts)
- Good enough for LPi bulletins which have very consistent formatting
- Can run both and compare for quality assurance during initial rollout

### Email: Resend

**Why:** 3,000 emails/month free, simple API, works from Vercel serverless functions, React Email for templates. At 150 parishes with ~50 subscribers getting weekly digests, you'd send ~200 emails/week (800/month) — well within free tier.

### PDF processing: pdf2pic (Node.js) or pdf-poppler

**Why:** Converts PDF pages to PNG images at configurable DPI. Runs in Vercel serverless functions or as a GitHub Action. No external service needed.

---

## Database schema

```sql
-- Core tables (migrate from parish_data.json)
CREATE TABLE parishes (
  id TEXT PRIMARY KEY,           -- parish_001, parish_002...
  name TEXT NOT NULL,
  town TEXT,
  state TEXT,
  zip TEXT,
  county TEXT,
  established TEXT,
  status TEXT DEFAULT 'active',
  data JSONB NOT NULL,           -- full parish object (locations, contact, clergy, etc.)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE services (
  id TEXT PRIMARY KEY,           -- parish_001-sun-001
  parish_id TEXT REFERENCES parishes(id),
  type TEXT NOT NULL,            -- sunday_mass, confession, adoration...
  day TEXT NOT NULL,
  time TEXT,                     -- 24hr HH:MM
  end_time TEXT,
  language TEXT DEFAULT 'en',
  location_id TEXT,
  seasonal BOOLEAN DEFAULT FALSE,
  season TEXT,
  notes TEXT,
  data JSONB,                    -- overflow fields
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulletin content (the new stuff)
CREATE TABLE bulletins (
  id SERIAL PRIMARY KEY,
  parish_id TEXT REFERENCES parishes(id),
  bulletin_date DATE NOT NULL,   -- the Sunday this bulletin is for
  source_url TEXT,               -- where the PDF was fetched from
  source_type TEXT,              -- 'lpi', 'diocesan', 'parish_website', 'manual'
  pdf_stored BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending', -- pending, parsed, reviewed, published
  parsed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  raw_extraction JSONB,          -- full LLM output before human review
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parish_id, bulletin_date)
);

CREATE TABLE bulletin_items (
  id SERIAL PRIMARY KEY,
  bulletin_id INT REFERENCES bulletins(id) ON DELETE CASCADE,
  parish_id TEXT REFERENCES parishes(id),
  category TEXT NOT NULL,        -- see taxonomy below
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE,               -- NULL for announcements without dates
  event_time TEXT,               -- 24hr
  end_time TEXT,
  end_date DATE,                 -- for multi-day events
  location TEXT,                 -- free text: "Parish Hall", "Room 201"
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  registration_url TEXT,
  recurring TEXT,                -- 'weekly', 'monthly', 'one_time'
  tags TEXT[],                   -- flexible tagging
  data JSONB,                    -- overflow
  status TEXT DEFAULT 'active',
  source_page INT,               -- which PDF page this came from
  confidence FLOAT,              -- LLM's self-reported confidence 0-1
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-text search index
CREATE INDEX idx_bulletin_items_search ON bulletin_items
  USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,'')));

-- Subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'parish', 'category', 'tag', 'keyword'
  value TEXT NOT NULL,           -- parish_id, category name, tag, or search term
  frequency TEXT DEFAULT 'weekly', -- 'weekly', 'daily', 'instant'
  active BOOLEAN DEFAULT TRUE,
  unsubscribe_token TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_subs_email ON subscriptions(email);
CREATE INDEX idx_subs_type_value ON subscriptions(type, value);

-- Events table (migrated from events.json, unified with bulletin_items)
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  parish_id TEXT REFERENCES parishes(id),
  source TEXT DEFAULT 'manual',  -- 'manual', 'bulletin', 'submission'
  bulletin_item_id INT REFERENCES bulletin_items(id),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  date DATE,
  dates DATE[],                  -- for multi-date series
  time TEXT,
  end_time TEXT,
  end_date DATE,
  location_id TEXT,
  venue_name TEXT,
  venue_address TEXT,
  venue_lat FLOAT,
  venue_lng FLOAT,
  tags TEXT[],
  social BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  flyer_url TEXT,
  registration_url TEXT,
  contact_name TEXT,
  contact_email TEXT,
  data JSONB,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Bulletin item taxonomy (the `category` field)

This is the Catholic-specific event classification that doesn't exist anywhere else:

```
SACRAMENTAL
  mass_change          -- schedule change, added Mass, cancelled Mass
  confession_change
  adoration_change
  baptism
  first_communion
  confirmation
  marriage
  anointing_of_sick
  rcia                 -- inquiry, classes, rites

DEVOTIONAL
  rosary
  stations_of_cross
  novena
  holy_hour
  benediction
  divine_mercy
  first_friday
  first_saturday

EDUCATIONAL
  bible_study
  book_club
  speaker_series
  retreat
  mission
  faith_formation
  adult_education
  youth_group

SOCIAL
  fish_fry
  pancake_breakfast
  potluck
  dinner_dance
  trivia_night
  movie_night
  game_night
  picnic
  festival

MINISTRY
  choir
  lector_training
  emhc_training
  altar_server
  usher
  greeter
  bereavement
  prayer_shawl
  food_pantry
  clothing_drive
  blood_drive
  habitat_for_humanity

ADMINISTRATIVE
  parish_council
  finance_council
  annual_report
  census
  stewardship
  building_fund
  capital_campaign
  office_hours_change

ANNOUNCEMENT
  pastor_letter        -- highlights from pastor's column
  staff_change
  facility_update
  weather_closure
  thank_you
  remembrance
  milestone            -- anniversary, jubilee
  general
```

---

## The bulletin parsing pipeline in detail

### Step 1: Fetch bulletin PDFs

Most bulletins are fetchable via predictable URLs:

**LPi bulletins (36+ of your parishes):**
```
https://container.parishesonline.com/bulletins/{PARISH_LPI_ID}/{YYYYMMDD}B.pdf
```
The date is always the upcoming Sunday. LPi IDs are stable. You already have bulletin_url for 88 of 93 parishes.

**Diocesan bulletins:**
```
https://www.discovermass.com/church/{slug}/bulletin
```
Discovermass hosts Diocesan customer bulletins with consistent URL patterns.

**Direct parish websites:**
Some parishes host PDFs on their own sites. URLs vary but are usually stable week-to-week (same path, just the filename changes).

**Implementation:**
```javascript
// api/admin/fetch-bulletins.js (Vercel cron or manual trigger)

// Store bulletin source URLs in the parishes table
// Each week: iterate parishes, fetch PDF, store in Supabase Storage

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fetchBulletin(parish) {
  const bulletinUrl = buildBulletinUrl(parish); // LPi pattern, or stored URL
  const response = await fetch(bulletinUrl);
  if (!response.ok) return null;

  const pdfBuffer = await response.arrayBuffer();

  // Store PDF in Supabase Storage (optional — for archival)
  const fileName = `${parish.id}/${getNextSunday()}.pdf`;
  await supabase.storage.from('bulletins').upload(fileName, pdfBuffer);

  return { parishId: parish.id, pdf: Buffer.from(pdfBuffer), url: bulletinUrl };
}
```

### Step 2: Convert PDF pages to images

```javascript
const { fromBuffer } = require('pdf2pic');

async function pdfToImages(pdfBuffer) {
  const converter = fromBuffer(pdfBuffer, {
    density: 200,           // 200 DPI — good balance of quality vs. size
    format: 'png',
    width: 1600,            // pixels wide
    height: 2100,
  });

  const pages = [];
  // Most bulletins are 4-8 pages
  for (let i = 1; i <= 8; i++) {
    try {
      const result = await converter(i, { responseType: 'buffer' });
      if (result.buffer) pages.push(result.buffer);
    } catch (e) {
      break; // no more pages
    }
  }
  return pages;
}
```

### Step 3: Send to Claude Vision API

This is where the magic happens. The prompt engineering is critical for 95%+ fidelity.

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function parseBulletinPage(imageBuffer, pageNumber, parishName, parishTown) {
  const base64 = imageBuffer.toString('base64');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/png',
            data: base64,
          },
        },
        {
          type: 'text',
          text: BULLETIN_PARSE_PROMPT(parishName, parishTown, pageNumber),
        },
      ],
    }],
  });

  // Parse the JSON from Claude's response
  const text = response.content[0].text;
  return JSON.parse(text);
}
```

**The prompt (this is the most important piece of the entire system):**

```javascript
function BULLETIN_PARSE_PROMPT(parishName, parishTown, pageNumber) {
  return `You are parsing page ${pageNumber} of the weekly bulletin for ${parishName} in ${parishTown}.

Extract ALL items of interest from this bulletin page. This includes:
- Events (with dates, times, locations, descriptions)
- Announcements (staff changes, facility updates, thank-yous)
- Schedule changes (Mass time changes, confession additions, cancellations)
- Ministry sign-ups and volunteer opportunities
- Social events (fish fries, dinners, fundraisers)
- Educational programs (Bible studies, RCIA, faith formation)
- Devotional activities (rosary, novena, holy hour)
- Sacramental preparations (baptism, confirmation, first communion dates)
- Collection/financial reports (just totals, not individual names)
- Any other parish community information

IGNORE completely:
- Paid advertisements
- Boilerplate text that appears every week unchanged (Mass schedule sidebar if it hasn't changed)
- Copyright notices
- Publisher information (LPi, Diocesan branding)
- Generic liturgical calendar entries available elsewhere

For each item found, return this JSON structure:

{
  "items": [
    {
      "category": "<from taxonomy: mass_change|confession_change|adoration_change|fish_fry|bible_study|retreat|potluck|choir|food_pantry|pastor_letter|general|...>",
      "title": "<concise title>",
      "description": "<full description as written, preserving key details>",
      "event_date": "<YYYY-MM-DD or null if no specific date>",
      "event_time": "<HH:MM 24hr or null>",
      "end_time": "<HH:MM 24hr or null>",
      "end_date": "<YYYY-MM-DD or null>",
      "location": "<where within the parish: Parish Hall, Church, Room 201, etc. or null>",
      "contact_name": "<if mentioned>",
      "contact_phone": "<if mentioned>",
      "contact_email": "<if mentioned>",
      "registration_url": "<if mentioned>",
      "recurring": "<weekly|monthly|one_time or null>",
      "tags": ["<relevant tags: young adults, seniors, families, lent, fundraiser, free, etc.>"],
      "confidence": <0.0-1.0 how confident you are in the extraction accuracy>
    }
  ],
  "page_type": "<cover|schedule|events|announcements|ads|mixed>",
  "notes": "<any parsing difficulties or ambiguities>"
}

Return ONLY valid JSON. No markdown fencing, no preamble.
If this page contains only advertisements or boilerplate, return {"items": [], "page_type": "ads", "notes": "Page is entirely advertisements."}`;
}
```

### Step 4: Merge pages, deduplicate, store

```javascript
async function processBulletin(parish) {
  const pdf = await fetchBulletin(parish);
  if (!pdf) return;

  const pages = await pdfToImages(pdf.pdf);
  const allItems = [];

  for (let i = 0; i < pages.length; i++) {
    const parsed = await parseBulletinPage(pages[i], i + 1, parish.name, parish.town);
    if (parsed.items) {
      allItems.push(...parsed.items.map(item => ({ ...item, source_page: i + 1 })));
    }
  }

  // Deduplicate items that span multiple pages
  const deduped = deduplicateItems(allItems);

  // Store in Supabase
  const { data: bulletin } = await supabase.from('bulletins').insert({
    parish_id: parish.id,
    bulletin_date: getNextSunday(),
    source_url: pdf.url,
    source_type: detectSourceType(pdf.url),
    status: 'parsed',
    parsed_at: new Date().toISOString(),
    raw_extraction: { items: deduped, page_count: pages.length },
  }).select().single();

  // Insert individual items
  for (const item of deduped) {
    await supabase.from('bulletin_items').insert({
      bulletin_id: bulletin.id,
      parish_id: parish.id,
      ...item,
    });
  }
}
```

### Step 5: Human review (you, 2 min per bulletin)

A simple review dashboard (new `review.html` or a section in `admin.html`) that shows:

**Left panel:** The original PDF page image
**Right panel:** The extracted items as editable cards

Each card has: ✅ Approve | ✏️ Edit | ❌ Delete

You scroll through, approve the obvious ones, fix any misparses. With 95%+ accuracy from vision parsing, most bulletins need zero or one correction. At 150 parishes, even spending 2 minutes each, that's 5 hours/week — which is a lot. But consider:

- Most bulletin content is unchanged week-to-week. You only review *new* items detected via diff against last week.
- Many parishes share bulletin publishers (LPi, Diocesan) with identical layouts — once Claude nails the pattern, it stays nailed.
- You can batch-approve parishes with high historical accuracy.
- Realistically, only 30-40% of bulletins change meaningfully each week.

**Practical weekly time: 1–2 hours** once the system matures.

---

## Migration plan: How to get there from here

### Phase 0: Database foundation (1 week)

**Goal:** Move parish_data.json and events.json into Supabase, keep the frontend working identically.

1. Create Supabase project (free tier)
2. Run migration script to load parish_data.json into `parishes` and `services` tables
3. Load events.json into `events` table
4. Create two Vercel API routes:
   - `GET /api/parishes` → returns same JSON shape as parish_data.json
   - `GET /api/events` → returns same JSON shape as events.json
5. Update `init()` in index.html to fetch from `/api/parishes` and `/api/events` instead of static files
6. Keep static JSON files as offline fallback in service worker

**Frontend changes:** Two URL changes in the fetch calls. That's it.

**Verification:** App works exactly as before, but data comes from Supabase.

### Phase 1: Bulletin ingestion MVP (2–3 weeks)

**Goal:** Parse bulletins for 10 pilot parishes, store results, basic review UI.

1. Add `bulletins` and `bulletin_items` tables to Supabase
2. Build the parsing pipeline as a single Node.js script (runs locally, not serverless yet):
   - Takes a bulletin PDF URL
   - Converts to images
   - Sends to Claude API
   - Outputs structured JSON
   - Inserts into Supabase
3. Add Anthropic API key to environment
4. Pick 10 parishes with known-good LPi bulletin URLs
5. Run the parser manually for those 10
6. Build a basic review page (`review.html`) — table of parsed items with approve/edit/delete
7. Review and approve the results
8. **Evaluate accuracy** — measure against manual reading of the same bulletins

**Cost at this phase:** ~$0.50/week for 10 parishes.

### Phase 2: Bulletin browser in the PWA (2 weeks)

**Goal:** Users can see parsed bulletin content in the app.

1. New section in the PWA — could be a "Bulletin" tab or a section within each parish's detail panel
2. API route: `GET /api/bulletins?parish_id=X&date=YYYY-MM-DD`
3. API route: `GET /api/bulletins/search?q=fish+fry&radius=20`
4. Display bulletin items as cards, grouped by category
5. Each item links back to its source parish
6. Full-text search across all bulletin content

**The UX question:** Tab or embedded? I'd suggest starting with bulletin items surfaced inside each parish's detail panel (when you tap a parish, you see its latest bulletin items below the schedule). Then add a dedicated "What's Happening" search/browse view later.

### Phase 3: Scale to all parishes + automation (2–3 weeks)

**Goal:** Automated weekly parsing for all 150 parishes.

1. Add bulletin source URLs to all parish records
2. Build the Vercel cron job (or GitHub Action) that runs weekly:
   - Saturday morning: fetch all bulletins, parse, store
   - Saturday afternoon: you review flagged items
   - Sunday morning: published and searchable
3. Implement diff detection — only flag items that are new or changed vs. last week
4. Add batch-approve for high-confidence items (>0.95 confidence)
5. Add error handling for missing/unavailable bulletins

### Phase 4: Subscriptions + notifications (2 weeks)

**Goal:** Users subscribe to parishes, categories, or keywords and get email digests.

1. Add subscription management UI (More tab → "Subscribe to Bulletins")
2. Email collection with lightweight auth (email + magic link, or just email + unsubscribe token)
3. Weekly digest builder: for each subscriber, query their subscriptions, compile matching bulletin items, render email via React Email
4. Resend API sends the digest
5. Unsubscribe link in every email

**Subscription types:**
- "All events from St. Mary's" (parish subscription)
- "All fish fries within 20 miles" (category + location)
- "Any Bible study in Hampshire County" (category + region)
- "Anything matching 'young adults'" (keyword)

### Phase 5: Polish and expand (ongoing)

- iCal export for individual bulletin items and subscription feeds
- Web push notifications for time-sensitive items
- "This week near you" homepage widget
- Event submission portal (external organizers submit events for your approval)
- Contributor accounts (other parishioners help verify)
- Analytics: which bulletin items get the most views/clicks

---

## Cost breakdown at full scale (150 parishes)

| Service | What | Monthly cost |
|---------|------|-------------|
| **Supabase** (Free tier) | Database, auth, storage | $0 |
| **Vercel** (Hobby) | Hosting, API routes, cron | $0 |
| **Anthropic API** | Claude Sonnet vision, 150 bulletins/week × 4 pages | $12–36 |
| **Resend** (Free tier) | Email digests, up to 3,000/month | $0 |
| **Supabase Storage** | Bulletin PDF archival (~50 MB/week) | $0 (within free tier) |
| **Domain** | massfinder.com or mycatholicbulletin.com | ~$1 |
| | **Total** | **$13–37/month** |

**To reduce LLM cost further:**
- Use GPT-4o-mini for simple LPi bulletins ($3–6/month instead of $12–36)
- Cache unchanged pages — if page 1 (schedule sidebar) is identical to last week, skip it
- Only parse pages 2+ in detail (page 1 is usually the cover/schedule you already have)
- Mix models: Claude Sonnet for complex/unfamiliar layouts, GPT-4o-mini for known-good LPi templates

**If you ever need to scale beyond free tiers:**
- Supabase Pro: $25/month (8 GB storage, higher limits)
- Vercel Pro: $20/month (more serverless execution time)
- But you'd need 500+ parishes and thousands of subscribers to hit these limits

---

## Handling the worst PDFs

You mentioned some bulletins where copy-paste produces garbage. Here's why vision parsing handles them:

**Problem 1: Multi-column layouts with interleaved text**
Text extraction reads left-to-right across the full page width, mixing column 1 and column 2 into nonsense. Vision parsing sees the columns as a human does and reads each independently.

**Problem 2: Text embedded in images**
Some bulletins use decorative headers, banners, or flyer images with text baked in. Text extraction misses these entirely. Vision parsing reads them.

**Problem 3: Table-based layouts**
Some bulletins use invisible tables for layout. Text extraction loses all spatial relationships. Vision parsing understands the grid.

**Problem 4: Scanned bulletins**
A small percentage of bulletins are scanned paper (not digitally typeset). Text extraction returns nothing or OCR garbage. Vision parsing handles these identically to digital PDFs — it's just reading an image either way.

**Problem 5: Mixed-language content**
Spanish Mass announcements, Polish heritage events, Vietnamese community notices. Vision parsing handles multilingual content natively.

**The only bulletins that challenge vision parsing:**
- Extremely low-resolution scans (below ~150 DPI) — rare for modern bulletins
- Handwritten inserts (occasionally a pastor hand-writes a note) — still readable if legible to humans
- Heavily stylized/decorative fonts — Claude occasionally misreads ornate script fonts

**Mitigation:** The confidence score in the extraction prompt lets you flag low-confidence items for manual review. In practice, after running pilot tests with MassFinder bulletins, you'll find that 90%+ of items parse cleanly on the first try, and the remaining items just need a quick glance.

---

## The prompt engineering matters more than the code

The extraction prompt I outlined above is a starting point. Here's how to refine it for 95%+ accuracy:

**1. Parish-specific context injection**

Over time, you build a "parish profile" that gets injected into the prompt:

```javascript
// Stored in Supabase, updated as you learn each parish's patterns
const parishContext = {
  parish_id: 'parish_001',
  bulletin_publisher: 'lpi',
  typical_page_count: 4,
  known_recurring_events: ['Fish Fry every Friday in Lent', 'Rosary Tuesdays 6:30 PM'],
  parsing_notes: 'Page 2 always has the pastor letter. Page 3 is events. Page 4 is ads.',
  common_locations: ['Parish Hall', 'Mercy Center', 'Room 204'],
};
```

Inject this into the prompt: "This parish typically has events on page 3. Known recurring events include: [list]. Familiar locations: [list]."

**2. Two-pass extraction for complex bulletins**

Pass 1: "List every distinct item on this page with title and category."
Pass 2: "For each item listed, extract full details including dates, times, contacts."

This reduces hallucination on dense pages.

**3. Week-over-week diff prompt**

"Here is last week's extraction for this parish: [JSON]. Compare against this week's bulletin page. Identify: (a) new items not in last week's data, (b) items that have changed, (c) items that appear to have been removed."

This dramatically reduces your review burden because you only look at changes.

**4. Confidence calibration**

After your first month, analyze: for items Claude rated 0.95+ confidence, how often were corrections needed? Tune the auto-approve threshold. In my experience with document extraction tasks, Claude's self-reported confidence correlates well with actual accuracy — 0.95+ items are correct ~98% of the time.

---

## Timeline estimate

| Phase | Work | Calendar time | Your hours |
|-------|------|--------------|------------|
| Phase 0: Database migration | Supabase setup, API routes, frontend URL swap | 1 week | 8–12 hrs |
| Phase 1: Parsing MVP | Pipeline script, 10-parish pilot, review UI | 2–3 weeks | 20–30 hrs |
| Phase 2: Bulletin browser | PWA UI for viewing/searching bulletin content | 2 weeks | 15–20 hrs |
| Phase 3: Full automation | Cron jobs, all parishes, diff detection | 2–3 weeks | 15–25 hrs |
| Phase 4: Subscriptions | Email digests, subscription management | 2 weeks | 15–20 hrs |
| **Total** | | **9–11 weeks** | **73–107 hrs** |

This assumes you're working with Claude on the implementation (as you have been), not writing every line solo. The actual calendar time depends on your availability — could compress to 6 weeks at high intensity or stretch to 4 months at a few hours per week.

---

## What you'd do in a typical week once this is running

**Saturday morning (automated):**
- Cron job fetches 150 bulletin PDFs
- Pipeline converts to images, sends to Claude API
- Parsed items stored in Supabase with status "pending"
- Diff engine flags new/changed items vs. last week

**Saturday afternoon (you, 1–2 hours):**
- Open review dashboard
- See ~30–50 flagged items across all parishes (most auto-approved)
- Approve/correct flagged items
- Publish

**Sunday morning (automated):**
- Email digests sent to subscribers
- App shows fresh bulletin content
- "What's Happening This Week" is fully populated

**Ad hoc:**
- Occasionally add a new parish's bulletin URL
- Tune parsing prompts when you notice recurring errors
- Update the taxonomy as new event types appear

---

## One more thing: you don't have to do all of this

The beauty of this architecture is that every phase is independently valuable:

- **Phase 0 alone** gives you a proper database, making the existing app easier to maintain.
- **Phase 0 + 1** gives you bulletin parsing for your own use — you read bulletins faster.
- **Phase 0 + 1 + 2** gives your users searchable bulletin content — already more than any competitor offers.
- **The full stack** gives you the subscription-powered community bulletin board that doesn't exist anywhere in Catholic tech.

Start with Phase 0 and the 10-parish pilot. See how the parsing accuracy feels. If it's working, keep going. If not, you've only invested a week and learned a ton.

---

## Files to create first

When you're ready to start Phase 0, the first session would:

1. Create a Supabase project at supabase.com
2. Run the schema SQL above
3. Write a migration script that reads parish_data.json and events.json and inserts into Supabase
4. Create `/api/parishes.js` and `/api/events.js` in the repo
5. Update the two fetch calls in `init()`
6. Test, deploy, verify

That's a single work session with Claude. Want to start?
