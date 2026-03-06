# MassFinder Development Roadmap

**Last updated:** 2026-03-06
**Status:** Batch 1 (Supabase) complete, Batch 2 (bulletin parsing) in progress

---

## Where we are today

MassFinder is a vanilla JS PWA with a Supabase backend. Frontend is framework-free. Data served via Supabase REST API with static JSON as offline fallback.

| Metric | Count |
|--------|-------|
| Parishes | 93 active |
| Churches (worship sites) | 119 |
| Services tracked | ~1,407 |
| Community events | ~203 |
| Parishes validated | 28 of 93 |
| States covered | MA, CT, VT, NH |

**Stack:** HTML/CSS/JS → Vercel → Supabase (PostgreSQL) → service worker for offline

**Completed:** Batch 1 (database migration), Batch 2 (bulletin parsing pipeline — core engine working, review UI built)
**In progress:** Batch 2 refinement (prompt accuracy, review UI polish, edit modal validation)

**What works well:** Find tab with filters/search/sort, Map tab with Leaflet markers, Saved tab with favorites, More tab with readings/liturgical calendar/devotional guides, deep linking, distance-based sorting, language badges, seasonal (Lent) filtering, multi-location parish support, admin panel for data editing.

---

## Where we're going (V2)

**One sentence:** Add a Supabase database, Vercel serverless API, and a weekly Claude Vision pipeline that reads bulletin PDFs as images to extract every event, announcement, and schedule change into structured, searchable, subscribable data.

**Monthly cost at 150 parishes:** $13–37/month (all free tiers + ~$12–25 Anthropic API)

---

## The 6 batches

### Batch 1: Database Foundation — COMPLETE
> _Deployed to production. Supabase project: `mgbhmwnaipopdctbihmf.supabase.co`_

**Goal:** Move `parish_data.json` and `events.json` into Supabase. Serve via Vercel API routes. Keep static files as offline fallback. Zero UI changes.

**What gets built:**
- Supabase project (free tier, us-east-1) with 3 tables: `parishes`, `events`, `metadata` — JSONB-first schema, normalize later
- Migration script (`scripts/migrate-to-supabase.js`) to load JSON data into Supabase
- Two API routes: `GET /api/parishes`, `GET /api/events` — return exact same JSON shapes the frontend expects
- Shared Supabase client (`api/_lib/supabase.js`)
- `package.json` with `@supabase/supabase-js`
- `vercel.json` with edge caching headers (5-min `s-maxage`)
- Frontend `init()` updated: try API first → fall back to static JSON
- Service worker updated: `/api/` routes added to stale-while-revalidate

**What users notice:** Nothing. App looks and works identically.

**Verify:** Row counts match JSON file counts. App smoke test passes on all tabs. Offline mode works.

---

### Batch 2: Bulletin Parsing Pipeline — IN PROGRESS
> _Core pipeline working. Review UI built. Prompt refinement ongoing._

**Goal:** Build the engine that reads bulletin PDFs and produces structured data.

**What gets built:**
- `bulletins` and `bulletin_items` database tables
- Parsing script: fetch PDF → `pdf2pic` to PNG (200 DPI) → Claude Sonnet vision API → structured JSON
- Bulletin parse prompt with Catholic-specific taxonomy (34 categories across 8 groups: Sacramental, Devotional, Educational, Social, Ministry, Administrative, Announcement)
- Parish profile system for per-parish context injection
- Week-over-week diff detection (only flag new/changed items)
- 10-parish pilot → expand to 50 → all available

**The prompt is the product.** Two-pass extraction for dense pages, parish context injection, confidence scoring. See the full prompt in the Roadmap doc.

**Cost:** ~$0.02–0.06 per bulletin. 150 bulletins/week = $12–36/month.

**Verify:** 90%+ accuracy on LPi bulletins. Parser handles multi-column layouts, embedded images, bilingual content.

---

### Batch 3: Bulletin Content in the App (Weeks 6–7)
> _Detailed spec: `MassFinder_V2_Build_Plan.md` § Batch 3, `MassFinder_UX_Vision.md` § Parish Profile_

**Goal:** Users see parsed bulletin content. The app becomes indispensable.

**What gets built:**
- **"This Week's Bulletin"** section in parish detail panels (below schedule, above contact info)
  - Category icons, titles, dates/times, descriptions
  - "Add to Calendar" button for dated items
  - "Interested" heart counter (anonymous, device-local deduplication)
- **Events chip** on Find tab filter bar — transforms card list to show events across all parishes
- **Event category filters** in More Filters overlay (Social, Devotional, Educational, Volunteer, Youth, Senior, Family)
- **Event pins on Map** — gold pins for events alongside navy church pins, toggle overlay
- **Experiential tip tags** on event details — predefined structured tips (Parking limited, Arrive early, Family friendly, etc.) with 2+ submission threshold
- API routes: `GET /api/bulletins?parish_id=X`, `GET /api/bulletins/search?q=fish+fry`

**What users notice:** Tap a parish → see this week's bulletin highlights. New "Events" filter shows everything happening in the region. Map lights up with event pins during Lent.

---

### Batch 4: Review Dashboard & Automation (Weeks 8–9)
> _Detailed spec: `MassFinder_V2_Build_Plan.md` § Batch 4_

**Goal:** Sustainable weekly workflow. Your review time drops to 60–90 minutes.

**What gets built:**
- Bulletin Review Queue (in admin panel or new `review.html`)
  - Left panel: original PDF page image
  - Right panel: extracted items as editable cards
  - Actions: Approve / Edit / Discard / Unchanged
  - "Auto-approve unchanged" batch action
  - Progress bar ("47 of 52 reviewed")
  - Grouped by parish, sorted by confidence score
- Weekly cron job (Saturday 6 AM): fetch all bulletins → parse → store → flag for review
- Parish profile accumulation (corrections feed back into per-parish context)
- Error handling for missing/broken bulletin URLs

**Weekly operator workflow:**
- Saturday AM (automatic): fetch + parse all bulletins
- Saturday PM (you, 60–90 min): review flagged items, auto-approve unchanged
- Sunday AM (automatic): approved items go live

---

### Batch 5: Email Subscriptions & Donations (Weeks 10–11)
> _Detailed spec: `MassFinder_V2_Build_Plan.md` § Batch 5, `MassFinder_UX_Vision.md` § Subscriptions_

**Goal:** People subscribe and get a Saturday email they look forward to.

**What gets built:**
- **Subscribe section** in More tab — email + parish selection + interest categories
- **Subscription types:**
  - By parish ("Everything from St. Mary's")
  - By category ("All fish fries in the region")
  - By keyword ("young adults")
  - By distance ("Events within 10 miles")
- **Weekly digest email** via Resend (free tier, 3,000/month):
  1. "At Your Parish This Week" — saved parishes' bulletin highlights
  2. "Picked For You" — matching events from other parishes
  3. "More This Week" — regional highlights
- **Unsubscribe** — one-click via token in every email
- **Ko-fi donation card** in More tab (appears after 3+ app opens, dismissible for 90 days)
- **Ko-fi link** in email footer
- `subscriptions` database table

**What users notice:** Enter email, pick interests, get a beautiful Saturday email. A warm donation card appears eventually.

---

### Batch 6: Contributor Portal (Weeks 12–13)
> _Detailed spec: `MassFinder_V2_Build_Plan.md` § Batch 6, `MassFinder_Open_Source_Guide.md`_

**Goal:** Trusted volunteers help verify data. Your maintenance load drops.

**What gets built:**
- Supabase Auth with magic link email login (no passwords)
- **Three contributor roles:**
  - **Bulletin Spotter** — confirm/flag bulletin items for their parish
  - **Data Verifier** — verify parish schedules, suggest additions
  - **Trusted Editor** — directly publish changes for assigned parishes
- Contributor dashboard (`/contribute`) — clean, simple, big buttons, works on mobile
- Invite/management tools in admin panel
- Activity logging

**What users notice:** Nothing (contributor-facing). But data quality improves and your time drops to <1 hr/week.

---

## V3 (future, after V2 is stable)

- iOS/Android App Store via Capacitor wrapper (push notifications, widgets, home screen badge)
- Natural language search ("Where can I go to confession Saturday afternoon?")
- Parish comparison view for newcomers
- iCal feed subscriptions (live calendar URLs)
- Print stylesheet for 55+ crowd (fridge-friendly event summary)
- Expanded coverage beyond Western New England
- Diocesan partnerships and Catholic foundation grants
- Multi-language UI localization (Spanish, Polish, Portuguese)

---

## Tech stack (V2 target)

| Layer | Technology | Cost |
|-------|-----------|------|
| Frontend | Vanilla HTML/CSS/JS (PWA) | — |
| Hosting | Vercel (free tier) | $0 |
| Database | Supabase PostgreSQL (free tier) | $0 |
| API | Vercel Serverless Functions | $0 |
| Bulletin parsing | Claude Sonnet vision API | $12–25/mo |
| Email | Resend (free tier, 3K/mo) | $0 |
| Donations | Ko-fi (0% platform fee) | $0 |
| Domain | Already owned | ~$1/mo |
| **Total** | | **$13–26/mo** |

---

## Dev environment requirements

**Must have:**
- Node.js 18+ via nvm (`nvm install 20`)
- Vercel CLI (`npm install -g vercel`)
- Supabase account (free project)
- Anthropic API account ($10 initial credits)

**Needed by Batch 5:**
- Resend account (free tier)
- Ko-fi page

**Recommended VSCode extensions:** Supabase, REST Client, ESLint, Prettier, Error Lens, GitLens, Live Server

---

## Open source community plan

> _Full guide: `MassFinder_Open_Source_Guide.md`_

**Realistic goal:** 3–10 developer contributors

**Setup needed:**
- GitHub Issues with labels (`good first issue`, `help wanted`, `frontend`, `backend`, `bulletin-parser`, `accessibility`)
- Issue templates (bug report, feature request, data correction)
- PR template with checklist
- CODEOWNERS file
- Branch protection on `main`
- Mission-first README rewrite

**Good first issues to create:**
1. Print stylesheet for events view
2. `prefers-reduced-motion` media query for all animations
3. Missing `aria-label` audit
4. Dark mode via `prefers-color-scheme`
5. Search matching against event titles/descriptions
6. Unit tests for date/time formatting functions

**Where to find contributors:** SENT Ventures, Catholic Open Source (CatholicOS), r/CatholicProgrammers, diocesan networks, college CS departments (Holy Cross, UMass, WPI)

---

## Design principles (every batch)

> _Full vision: `MassFinder_UX_Vision.md`_

- **Apple Human Interface Guidelines** — the design standard throughout
- **Mobile-first, 55+ accessible** — 48pt touch targets, 17pt minimum body text, 10:1+ contrast ratio
- **Dynamic Type** support (rem units, test at 200% zoom)
- **`prefers-reduced-motion`** respected for all animations
- **Offline-first** — aggressive service worker caching, app works in dead zones
- **Progressive disclosure** — show essentials first, details on tap
- **Notifications as a thoughtful friend** — digest email default, push only for urgent (schedule changes, cancellations), never more than 2–3/week

---

## Accessibility checklist (applied to every new screen)

- [ ] Touch targets >= 48x48pt with 12pt spacing
- [ ] Body text >= 17pt, relative units (rem)
- [ ] Contrast >= 7:1 for body text, >= 4.5:1 for large text
- [ ] All interactive elements have `aria-label`
- [ ] Animations wrapped in `@media (prefers-reduced-motion: no-preference)`
- [ ] Tested with VoiceOver on iOS
- [ ] Tested at 200% browser zoom
- [ ] Works offline (service worker cache)

---

## Document index

| Document | Purpose | Status |
|----------|---------|--------|
| `ROADMAP.md` (this file) | Master plan — what, when, why | Active |
| `MassFinder_V2_Build_Plan.md` | Detailed 6-batch build sequence with contributor system and donation model | Active |
| `MassFinder_UX_Vision.md` | User experience vision — what the app should feel like | Active |
| `MassFinder_Open_Source_Guide.md` | GitHub community setup — issues, templates, contributor outreach | Active |
| `STYLE_GUIDE.md` | Design conventions and visual standards | Active |
| `TERMINOLOGY.md` | Project terminology definitions | Active |
| `ANTI_PATTERNS.md` | Common mistakes and anti-patterns to avoid | Active |
| `PERSONAS.md` | User personas | Active |
| `INTEGRATIONS.md` | External service integrations reference | Active |
| `archive/` | Superseded planning docs (Batch2 plan, Platform Roadmap, Dev Setup, Setup Runbook) | Archived |
