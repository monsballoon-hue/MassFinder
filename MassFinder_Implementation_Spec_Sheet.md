# MASSFINDER — Maintenance System Implementation

## Comprehensive Spec Sheet

**14-Day Implementation Plan**
30–45 minutes per day · $0 incremental cost · 98 parishes

Prepared: March 2, 2026 · Version 1.0

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [System Architecture](#3-system-architecture)
4. [Tool & Service Registry](#4-tool--service-registry)
5. [2-Week Implementation Schedule](#5-two-week-implementation-schedule)
   - Batch 1: Foundation & Pipeline (Days 1–3)
   - Batch 2: Admin Editor (Days 4–6)
   - Batch 3: Claude Parsing Workflow (Days 7–9)
   - Batch 4: Community Features (Days 10–12)
   - Batch 5: Polish & Go-Live (Days 13–14)
6. [Risk Register](#6-risk-register)
7. [Acceptance Criteria](#7-acceptance-criteria)
8. [Post-Launch: Daily Operations](#8-post-launch-daily-operations)

---

## 1. Executive Summary

This spec sheet defines a complete implementation plan for transforming MassFinder from a manually-maintained static dataset into a semi-automated, pipeline-driven maintenance system. The goal: keep 98 parishes across Western New England current within a 45–60 day freshness window, with the maintainer spending no more than 15 minutes per day on validation.

The system introduces five new capabilities:

- **Automated deployment pipeline** — JSON validation + auto-deploy via GitHub Actions and Vercel on every commit
- **Parish Editor form** — A schema-driven web form that generates clipboard-ready JSON for parish data injection
- **Claude parsing workspace** — A dedicated Claude Project with persistent knowledge for semi-automated bulletin/website parsing
- **Community tip jar** — Ko-fi integration for voluntary donations after users confirm service accuracy
- **Event submission portal** — A form for YC organizers to submit events that route to the maintainer for approval

> **KEY CONSTRAINT**
> Every tool and service in this plan operates within free tiers. The only costs are the existing Claude Pro subscription ($20/month) and domain registration (~$12/year). No new paid services are introduced.

---

## 2. Current State Assessment

### 2.1 Data Coverage

| Metric | Current Value | Notes |
|--------|--------------|-------|
| Total parishes | 98 | Across MA (80), CT (12), VT (4), NH (2) |
| Total services | 1,465 | 22 distinct service types |
| Parishes with website | 89 of 98 (91%) | 9 parishes have no website on file |
| Parishes with bulletin URL | 84 of 98 (86%) | 14 parishes have no bulletin URL |
| Validation: verified | 94 of 98 (96%) | 59 manually verified + 35 verified |
| Validation: low confidence | 2 of 98 | Data exists but source is stale |
| Languages served | 8 | EN, ES, PL, LA, PT, FR, ASL, VI |
| Locations (worship sites) | 130 | Some parishes have 2–3 church buildings |

### 2.2 Bulletin Hosting Landscape

Understanding where bulletins are hosted determines our parsing strategy. Two platforms account for 52% of all bulletin URLs:

| Platform | Parishes | % of Total | Format | Automation Potential |
|----------|----------|-----------|--------|---------------------|
| parishesonline.com (LPi) | 36 | 43% | Text-extractable PDF | HIGH — predictable URL patterns |
| church-bulletin.org | 8 | 10% | Text-extractable PDF | HIGH — consistent structure |
| Individual parish websites | 40 | 48% | Mixed (HTML + PDF) | MEDIUM — requires per-site logic |
| No bulletin URL on file | 14 | — | — | Manual verification required |

### 2.3 Architecture Snapshot

| Component | Current Implementation |
|-----------|----------------------|
| Frontend | Single-file PWA (index.html, ~2,079 lines inline HTML/CSS/JS) |
| Data store | parish_data.json (29,621 lines, ~842KB) |
| Events | events.json (447 lines, ~12KB) |
| Hosting | Vercel (Hobby tier, free) |
| Source control | GitHub repository |
| Service worker | sw.js — stale-while-revalidate for parish_data.json |
| Contact forms | Web3Forms (free tier, 250 submissions/month) |
| Analytics | Google Analytics (G-0XWS7YKHED) |
| Deployment | Manual push to main → Vercel auto-builds |

---

## 3. System Architecture

The maintenance system adds three new workflows to the existing MassFinder infrastructure. All workflows converge on the same endpoint: a validated commit to parish_data.json on the main branch, which triggers an automatic production deployment.

### 3.1 Workflow A: Daily Parish Review

This is the primary maintenance loop, targeting 2–5 parishes per day.

1. **Priority Queue** selects the next parishes for review based on staleness, seasonal urgency, and user-reported issues
2. **Claude Project** receives the parish's website URL and/or bulletin URL. Claude scrapes and parses the content, returning structured service data in MassFinder JSON format
3. **Maintainer reviews** side-by-side: current stored data vs. Claude's parsed output vs. the actual source (website/bulletin open in a browser tab)
4. **Corrections logged** to the Claude Project's corrections file, improving future parsing accuracy
5. **Approved JSON** is either pasted into the Parish Editor form for structural validation, or directly edited in parish_data.json via GitHub's web editor
6. **Commit to main** triggers the GitHub Actions pipeline: JSON schema validation → Vercel deploy → live in ~90 seconds

### 3.2 Workflow B: Parish Data Injection (New Parishes)

For adding new parishes (e.g., remaining CT expansion), the Parish Editor form is the primary tool.

1. **Open Parish Editor** (hosted at admin.massfinder.app or similar)
2. **Fill form fields** — dropdowns enforce enum values, dynamic arrays allow adding services
3. **Click "Copy JSON"** — clipboard contains a validated JSON object matching the parish schema
4. **Paste into parish_data.json** in the parishes array via GitHub web editor
5. **Commit triggers pipeline** — schema validation catches any structural errors before deploy

### 3.3 Workflow C: Event Submissions (Delegated)

YC organizers and community event coordinators submit events through a public form. The maintainer receives an email, spot-checks, and injects approved events.

1. **Organizer fills event form** (hosted on MassFinder or standalone page)
2. **FormSubmit.co sends email** to massfinderapp@gmail.com with structured event data
3. **Maintainer reviews** the email, confirms details
4. **Approved event** is added to events.json via GitHub web editor or Parish Editor
5. **Commit triggers deploy**

---

## 4. Tool & Service Registry

Every service operates within its free tier. The table below includes the specific account, configuration, and limits for each.

| Service | Purpose | Free Tier Limit | Account Action |
|---------|---------|----------------|----------------|
| GitHub Actions | CI/CD pipeline | Unlimited mins (public repo) | Already active — add workflow files |
| Vercel | PWA hosting + admin form | 100GB bandwidth, unlimited deploys | Already active — add admin subdomain |
| Web3Forms | Contact/correction forms | 250 submissions/month | Already active — no changes needed |
| FormSubmit.co | Event submission portal | Unlimited submissions | NEW — no signup needed, HTML only |
| Ko-fi | Donation/tip jar | 0% platform fee | NEW — create account at ko-fi.com |
| json-editor library | Admin form generator | Open source (MIT) | No account — CDN link in HTML |
| Claude Pro | Bulletin parsing + AI assist | $20/month (existing) | Already active — create new Project |
| Google Sheets | Priority queue tracker | Free with Google account | Already have account — create sheet |

> **WHY NOT A DATABASE?**
> The parish_data.json file IS the database. At 98 parishes and 842KB, a traditional database adds complexity without benefit. JSON-in-Git gives you version control (full history of every change), free hosting, instant rollback, and zero ongoing costs. The admin form generates JSON fragments that paste directly into this file. This is the right architecture for the scale and maintenance model.

---

## 5. Two-Week Implementation Schedule

The work is organized into five batches across 14 calendar days. Each day targets 30–45 minutes of hands-on work. Days marked with ⭐ are sessions where Claude builds the technical artifacts; the maintainer reviews and deploys.

---

### Batch 1: Foundation & Pipeline

*Days 1–3 · Total: ~100 minutes · **Outcome: Every commit is validated and auto-deployed***

#### DAY 1 (30 min) — JSON Schema + Repository Structure

The JSON Schema is the backbone of the entire system. It defines every allowed value in parish_data.json and powers both the GitHub Actions validator and the admin form.

- **⭐ Claude generates** a complete JSON Schema file (parish_schema.json) derived from the current data model. This schema enforces:
  - Required fields: id, name, town, state, zip, status, locations, services
  - Enum constraints: 22 service types, 8 languages, 5 season values, 21 day values
  - Format validation: 24hr time strings (HH:MM), parish_XXX ID patterns, lat/lng ranges
  - Structural rules: each parish must have at least one location; each service must reference a valid location_id
- **Maintainer reviews** the generated schema, confirms it matches expectations
- **Maintainer commits** parish_schema.json to the repository root

#### DAY 2 (35 min) — GitHub Actions: Validation Workflow

This workflow runs automatically on every push to main that touches parish_data.json or events.json. If validation fails, the commit is flagged and deployment is blocked.

- **⭐ Claude generates** the workflow file: `.github/workflows/validate-and-deploy.yml`
- Trigger: on push to main, path filter for *.json and src/** files
- Step 1: Checkout repository
- Step 2: Validate parish_data.json against parish_schema.json using ajv-cli
- Step 3: Run custom checks (duplicate ID detection, orphan location_id references, time format regex)
- Step 4: If validation passes, proceed to deploy step
- **Maintainer creates** the `.github/workflows/` directory in the repo and commits the file
- **Test:** Make a trivial edit to parish_data.json (add a space), push, and confirm the Action runs green

#### DAY 3 (35 min) — GitHub Actions: Vercel Auto-Deploy

Extends the validation workflow to automatically deploy to Vercel production when validation passes. This replaces the current manual push workflow.

- **⭐ Claude generates** the deploy step in the existing workflow file
- **Account setup:** Generate a Vercel API token at vercel.com/account/tokens (name it "GitHub-Actions-Deploy")
- **Account setup:** In GitHub repo Settings → Secrets and variables → Actions, add three secrets:
  - `VERCEL_TOKEN` (the API token you just created)
  - `VERCEL_ORG_ID` (from .vercel/project.json or Vercel dashboard → Settings → General)
  - `VERCEL_PROJECT_ID` (same location as above)
- **Disable Vercel's auto-deploy:** In Vercel project Settings → Git → set "Ignored Build Step" to `exit 0` (this prevents double deploys)
- **Test:** Push a commit, confirm GitHub Action runs validation + deploy, confirm site updates within ~90 seconds

> **BATCH 1 CHECKPOINT**
> After Day 3, every commit to main is automatically validated against the schema and deployed to production. This is the safety net for everything that follows — bad data cannot reach users.

---

### Batch 2: Parish Editor Form

*Days 4–6 · Total: ~110 minutes · **Outcome: A web form that generates validated, injection-ready JSON***

#### DAY 4 (40 min) — Parish Editor: Core Form

The Parish Editor is a single HTML page that uses the json-editor library to auto-generate a form from the parish JSON schema. It produces clipboard-ready JSON objects.

- **⭐ Claude builds** a complete, single-file HTML page (admin/index.html) containing:
  - CDN links to json-editor library and Bootstrap for styling
  - The parish JSON schema embedded inline (same schema from Day 1)
  - Dynamic form with dropdowns for all enums (service_type, day, season, language, state)
  - Add/Remove buttons for locations array, services array, clergy array
  - "Copy JSON to Clipboard" button that extracts the form data as formatted JSON
  - "Load Existing Parish" option: paste existing JSON to pre-populate form for editing
- **Maintainer reviews** the form in a browser, tests adding a fake parish with multiple services and locations

#### DAY 5 (40 min) — Parish Editor: Polish + Service ID Generator

Adds quality-of-life features that reduce manual work and prevent common errors.

- **⭐ Claude adds:**
  - Auto-generated service IDs following the `parish_XXX-type-day-time-location` pattern
  - Auto-generated location IDs following the `name-city` slug pattern
  - Validation warnings (red highlights) for missing required fields before copy
  - A "Validation Status" section that auto-populates with today's date and "verified" status
  - Default values for common patterns (is_seasonal: false, season: year_round, language: en)
- **Maintainer tests** by creating a real parish entry, copying JSON, and pasting into parish_data.json

#### DAY 6 (30 min) — Deploy Editor + End-to-End Test

- **Deploy option A (recommended):** Add admin/index.html to the existing repo. Vercel auto-serves it at `yourdomain.com/admin/`
- **Deploy option B:** Create a separate Vercel project for the admin form at `admin.massfinder.app` (keeps admin separate from public app)
- **End-to-end test:** Open Parish Editor → fill in a real parish (use one of the 14 without bulletin URLs) → copy JSON → paste into parish_data.json via GitHub web editor → commit → confirm Action validates + deploys → confirm new parish appears in live app
- *Note: The admin form has no authentication. This is acceptable because it only generates JSON on the client side — it never writes to the repo directly. The "security gate" is the GitHub commit step, which requires repo access.*

> **BATCH 2 CHECKPOINT**
> After Day 6, you have a form that generates valid parish JSON with correct IDs, enum values, and structure. Combined with the pipeline from Batch 1, you can add or update a parish in under 3 minutes: fill form → copy → paste → commit → live.

---

### Batch 3: Claude Parsing Workflow

*Days 7–9 · Total: ~105 minutes · **Outcome: A Claude Project that parses bulletins into MassFinder JSON with improving accuracy***

#### DAY 7 (30 min) — Create Claude Project + Upload Knowledge

Set up a dedicated Claude Project that serves as the daily parsing workspace. Project Knowledge files give Claude persistent context about MassFinder's schema and conventions.

- **In Claude (claude.ai):** Create a new Project named "MassFinder — Parish Validation"
- **Upload Project Knowledge files:**
  - `parish_schema.json` — the JSON schema from Day 1
  - A sample parish entry (copy one complete parish object from parish_data.json)
  - `parsing_instructions.md` — a document Claude generates defining how to extract service data from bulletins
  - `corrections_log.md` — starts empty, will accumulate parsing corrections over time
- **⭐ Claude generates** the parsing_instructions.md and corrections_log.md template files
- **Set Custom Instructions:** A system prompt telling Claude to always output MassFinder-formatted JSON, reference the schema, and check the corrections log before parsing

#### DAY 8 (40 min) — Parsing Templates + First Live Test

Create reusable prompt templates for the two most common bulletin formats and run the first real parsing session.

- **⭐ Claude generates** three prompt templates:
  - Template A: "Parse this LPi/ParishesOnline bulletin PDF" (for the 36 parishes on parishesonline.com)
  - Template B: "Parse this church website Mass schedule page" (for HTML-based schedules)
  - Template C: "Review existing data for [parish name] against this source" (for daily validation)
- **First live test:** Pick 3 parishes from the parishesonline.com group. Open each bulletin URL in a browser, save/copy the PDF, upload to Claude, and use Template A. Compare Claude's output against stored parish_data.json data.
- **Log corrections:** For each parsing error, add a note to corrections_log.md. Example: "Parish 001: Claude returned 'Stations' as service type; correct value is 'stations_of_cross'"

#### DAY 9 (35 min) — Expand Test + Refine Prompts

- Run 5 more parishes through the parsing workflow, mixing formats (LPi bulletins, church websites, church-bulletin.org)
- Refine parsing_instructions.md based on observed patterns and errors
- Update corrections_log.md with any new discrepancies
- **Establish the daily cadence:** By end of Day 9, you should have a repeatable 5-minute workflow: open Claude Project → paste URL or upload PDF → review output → approve/correct → update JSON → commit

> **BATCH 3 CHECKPOINT**
> After Day 9, you have a working daily review pipeline. Claude parses bulletins into structured JSON, you validate in under 5 minutes per parish, and corrections feed back into Claude's knowledge for progressively better accuracy. The corrections log is the "training data" — it's how the system gets smarter over time.

---

### Batch 4: Community Features

*Days 10–12 · Total: ~95 minutes · **Outcome: Tip jar + event submissions + priority queue***

#### DAY 10 (30 min) — Ko-fi Account + Tip Jar Integration

- **Create account:** Go to ko-fi.com → Sign up with massfinderapp@gmail.com → Complete profile (name: "MassFinder", description: "A free Catholic Mass finder for Western New England")
- **Configure:** Connect Stripe or PayPal for payouts → Set suggested amounts ($2, $5, $10) → Customize page color to match MassFinder branding
- **Get embed code:** Ko-fi provides a button widget (ko-fi.com/Widgets) — copy the HTML snippet
- **⭐ Claude integrates** the Ko-fi button into MassFinder's UI. Placement: appears as a subtle prompt after a user taps "Yes, times are correct" on a crowdsource verification. Copy: "Thanks for helping keep Mass times accurate! MassFinder is a free community project. If it's been helpful, consider leaving a tip. 🙏"
- **Behavior rules:** Show once per session maximum. Fully dismissible. Never on first visit. Never blocks content.

#### DAY 11 (35 min) — Event Submission Portal

A public-facing form for YC organizers and community members to submit events. Submissions are emailed to the maintainer for approval.

- **⭐ Claude builds** a single HTML page (events/submit.html) with:
  - Form fields: event title, date, time, end time, location/parish, type (dropdown matching events.json categories), description, contact email, optional flyer upload
  - FormSubmit.co integration (no signup needed — set form action to `https://formsubmit.co/massfinderapp@gmail.com`)
  - Hidden fields: `_subject` (auto-formats as "MassFinder Event Submission: [title]"), `_captcha` (true), `_next` (redirect to a thank-you page)
  - Mobile-friendly styling matching MassFinder's design language
- **Deploy:** Add to existing Vercel project at `/events/submit`
- **Test:** Submit a test event, confirm email arrives, confirm formatting is clear enough to copy into events.json

#### DAY 12 (30 min) — Priority Queue + Tracking System

A simple Google Sheet that tracks which parishes have been reviewed and calculates the next batch. This is the maintainer's daily dashboard.

- **⭐ Claude generates** the sheet structure and formulas:
  - Column A: Parish ID (parish_001 through parish_098)
  - Column B: Parish Name
  - Column C: Last Reviewed Date (manually entered after each review)
  - Column D: Days Since Last Review (`=TODAY()-C2`, auto-calculated)
  - Column E: Has Bulletin URL (TRUE/FALSE, from data)
  - Column F: Seasonal Flag (TRUE during 3 weeks before major liturgical transitions)
  - Column G: User-Reported Issue (TRUE if a correction report was received)
  - Column H: Priority Score (weighted formula combining D, F, G)
  - Sorted by Column H descending — the top 3–5 rows are always your next review batch
- *Alternative: If you prefer, Claude can generate this as a simple JSON-based tracker in the repo instead of a Google Sheet*

> **BATCH 4 CHECKPOINT**
> After Day 12, the community-facing features are live: users can tip via Ko-fi, organizers can submit events via the form, and you have a prioritized queue telling you exactly which parishes to review each morning.

---

### Batch 5: Polish & Go-Live

*Days 13–14 · Total: ~70 minutes · **Outcome: Everything tested end-to-end, documented, and ready for daily use***

#### DAY 13 (40 min) — Full Pipeline Test + Bug Fixes

Run the complete daily workflow from start to finish, exactly as it will work going forward.

- Open the Priority Queue sheet, identify the top 3 parishes
- Open Claude Project, run each through the parsing workflow
- Compare Claude's output against the live bulletin/website (open in separate tab)
- For any needed updates: use Parish Editor to generate corrected JSON, paste into parish_data.json
- Commit to main, confirm GitHub Action runs green, confirm Vercel deploy completes
- Verify changes appear on the live site within 2 minutes
- Update Priority Queue sheet with today's date for reviewed parishes
- **Fix any friction points:** Note anything that took longer than expected or caused confusion. Claude addresses these in the session.

#### DAY 14 (30 min) — Documentation + Standard Operating Procedure

- **⭐ Claude generates** a one-page SOP (Standard Operating Procedure) for the daily maintenance workflow
- The SOP is a simple checklist, suitable for printing or saving as a bookmark:
  - Step 1: Open Priority Queue → note top 3 parishes (1 min)
  - Step 2: Open Claude Project → paste each parish's bulletin/website → review output (3–5 min per parish)
  - Step 3: If changes needed, use Parish Editor or direct edit → commit (2 min)
  - Step 4: Update Priority Queue with review date (30 sec)
- **⭐ Claude also generates:**
  - CONTRIBUTING.md for the repo (in case you ever onboard a backup maintainer)
  - A README section documenting the maintenance system architecture

> **LAUNCH COMPLETE**
> After Day 14, the full system is operational. Your daily routine: 10–15 minutes each morning to validate 2–3 parishes, with the system getting progressively smarter through the corrections log. At 3/day, every parish is reviewed within 33 working days.

---

## 6. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Church website changes URL or goes offline | Medium | Low | Broken URLs are caught during review. 84/98 have bulletin URLs as fallback. For the 9 without websites, phone verification is the fallback. |
| PDF bulletin is image-based (not text-extractable) | Low | Medium | ~85–95% of LPi/Diocesan bulletins are text-based. For image PDFs, Claude's native vision handles them. Worst case: manual transcription for ~5 parishes. |
| Seasonal schedule not published in time | Medium | Medium | Parishes typically publish 1–3 weeks before a season change. Pre-season surge (5/day for 3 weeks before Christmas, Easter, summer) catches most. Display "last verified" date as honesty signal. |
| Maintainer burnout / missed days | Medium | High | System degrades gracefully — stale data is still served, not broken data. "Last verified" date sets expectations. Documented SOP enables backup maintainer. Batch size is flexible (1–7/day). |
| GitHub Actions / Vercel outage | Low | Low | Static CDN content serves during outages. Both services have 99.9%+ uptime. Manual deploy via Vercel CLI is always available as fallback. |
| JSON corruption from bad edit | Low | High | Schema validation in GitHub Actions blocks bad data from deploying. Git history allows instant rollback. Parish Editor form enforces structure. |
| Web3Forms / FormSubmit rate limits | Very Low | Low | Web3Forms free tier = 250/month. At ~5–10 submissions/month for corrections, this is 25x headroom. FormSubmit is unlimited. |
| Claude parsing accuracy degrades | Low | Medium | Corrections log provides continuous improvement. Prompt templates are version-controlled. Can switch LLM providers (GPT-4o-mini as fallback) with minimal template changes. |

---

## 7. Acceptance Criteria

Each batch has explicit pass/fail criteria. The system is considered operational when all criteria are met.

| Batch | Criterion | How to Verify |
|-------|----------|---------------|
| 1: Pipeline | A commit with invalid JSON (e.g., missing required field) is BLOCKED from deploying | Edit parish_data.json to remove a parish name, commit, confirm Action fails |
| 1: Pipeline | A commit with valid JSON auto-deploys to production within 2 minutes | Make a valid edit, commit, time the deploy |
| 2: Editor | Parish Editor generates JSON that passes schema validation on first try | Create a parish in the form, copy JSON, paste into data file, commit, confirm Action passes |
| 2: Editor | Service IDs are auto-generated in the correct parish_XXX-type-day-time-loc pattern | Fill in a service, inspect the generated ID |
| 3: Claude | Claude parses an LPi bulletin and produces valid MassFinder JSON with ≥80% field accuracy | Upload a bulletin, compare output to manually verified data |
| 3: Claude | The corrections log is referenced by Claude in subsequent parsing sessions | Add a correction, test a similar parish, confirm Claude applies the correction |
| 4: Ko-fi | Ko-fi button appears after service confirmation, is dismissible, and links to correct page | Tap "Yes, times correct" on any parish, confirm button appears, confirm dismiss works |
| 4: Events | Event submission form sends a properly formatted email to massfinderapp@gmail.com | Submit a test event, check inbox, confirm all fields are present |
| 4: Queue | Priority Queue correctly ranks parishes by staleness + seasonal urgency | Set one parish to 60 days ago, another to 5 days, confirm ordering |
| 5: E2E | Full daily workflow (3 parishes) completes in under 15 minutes | Time yourself through the complete workflow on Day 13 |

---

## 8. Post-Launch: Daily Operations

### 8.1 Daily Cadence

| Period | Parishes/Day | Full Cycle | Rationale |
|--------|-------------|-----------|-----------|
| Initial sprint (first 33 days) | 3 | 33 working days | Establish baseline freshness for all 98 parishes |
| Ordinary Time | 2 | 49 working days | Sustainable long-term pace, well within 60-day window |
| Pre-season surge (3 weeks before Christmas, Easter, summer) | 5 | 20 working days | Catch seasonal schedule changes before they go live |
| Post-season cooldown | 1 | 98 working days | Schedules just verified, lower urgency |

### 8.2 Seasonal Calendar (Key Dates for 2026)

| Season | Start Surge Review | Schedule Change Date | Notes |
|--------|-------------------|---------------------|-------|
| Lent | Feb 1 | Feb 18 (Ash Wednesday) | Stations of the Cross schedules added |
| Holy Week | Mar 15 | Mar 29 – Apr 5 | Completely unique 4-day schedule per parish |
| Easter return to ordinary | Apr 6 | Apr 12 (2nd Sunday) | Lenten services removed, ordinary resumes |
| Summer schedule | May 15 | ~June 1–15 | Many parishes drop a Mass or shift times |
| Fall return | Aug 15 | ~Sep 1–7 (Labor Day) | Summer reductions reversed |
| Advent | Nov 8 | Nov 29 (First Sunday) | Penance services and special Advent schedules |
| Christmas | Dec 1 | Dec 24–25 | 3–5 extra Masses per parish, unique times |

### 8.3 The Learning Loop

Over time, the corrections log transforms Claude from a generic parser into a MassFinder-specific one. Here's how the feedback loop works:

1. **Parse:** Claude processes a bulletin and outputs JSON
2. **Review:** Maintainer compares against source material
3. **Categorize error:**
   - **CORRECT GRAB, WRONG PARSE** — Right data, wrong field mapping (e.g., time in wrong format)
   - **MISSED ENTIRELY** — Service existed in source but Claude didn't extract it
   - **GRABBED IRRELEVANT** — Claude extracted a non-service item (e.g., fundraiser as a Mass)
   - **HALLUCINATED** — Claude fabricated data not present in the source
4. **Log:** Add categorized correction to corrections_log.md with parish name and date
5. **Claude references log:** On the next parsing session, Claude's Project Knowledge includes the updated log, preventing the same class of error

**Target trajectory:** Month 1 = ~70–80% field accuracy. Month 3 = ~85–90%. Month 6+ = ~90–95%. After 6–12 months of accumulated corrections, daily reviews shift from validation to spot-checking.

---

**END OF SPEC SHEET**

*Pending maintainer approval before proceeding to technical build guides*
