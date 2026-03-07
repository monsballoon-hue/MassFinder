# MassFinder — Engineering Runbook

> Single reference document for the MassFinder bulletin parsing pipeline and data system.
> Read this + `CLAUDE.md` + `DATA_STANDARDS.md` for full operational context.
>
> Last updated: 2026-03-07

---

## 1. Decision Log

Significant architectural decisions, what was tried, outcomes, and why we moved on. Prevents re-discovery of known dead ends.

### 1.1 V1 → V2 Pipeline Migration

**What V1 did:** PDF → Ghostscript PNG (200 DPI, 1600×2100) → Claude Sonnet 4 Vision API (one call per page, ~8K token prompt) → `parse-page.js` post-processing (sanitize enums, fix Saturday titles, split blob schedules, filter noise, dedup) → Supabase `bulletin_items` table → human review UI.

**V1 results (10 pilot churches):**
- Match rate: **57.3%** (71/124 expected services found)
- Cost: $2.74 total (~$0.35/church, ~80 pages)
- 8 distinct failure categories identified

**Why V1 failed:** The fundamental problem was asking Vision to extract everything from scratch on every page. This created compounding failures:

1. **Complete extraction failure** — Our Lady of Czestochowa (WordPress-hosted JPEG images): 10 pages parsed, 0 items on every page. Claude received the images (input tokens confirm this) but returned near-empty JSON. WordPress bulletin images were not processable by Vision.

2. **Multi-church bleeding** — Blessed Sacrament (Blessed Trinity Parish covering 3 churches): despite parish profile saying "BSC = Blessed Sacrament, HTC = Holy Trinity," Claude extracted all services from all churches and assigned them to the target. 10 false positives survived dedup. A single prompt instruction cannot reliably constrain Vision extraction to one church within a shared layout.

3. **Weekday Mass gaps** — Affected 4 churches, ~15 services lost. Claude sometimes compressed "Mon-Fri 7:00 AM" into a single item; other times it extracted some weekday Masses but not all. The page-by-page isolation meant no cross-page context to catch gaps.

4. **Confession/devotion blind spots** — Small-text sidebar confessions and devotions in secondary formatting were consistently missed. 200 DPI at 1600×2100 may not resolve fine print in margins, and the prompt's 8K tokens of rules may have diluted extraction focus.

5. **Over-extraction from duplicate schedule formats** — Blessed Sacrament had 62 raw items from page 1 alone (two schedule formats on the same page). St. Mary's had 32 items from page 1 blob splitting. Even aggressive dedup couldn't clean all false positives.

6. **Mass intention leakage** — Despite explicit exclusion rules, St. Joseph page 2 produced 11 items before filtering dropped them as intentions. The Vision model had difficulty distinguishing Mass intention lists from schedule data when they're interleaved.

**What V2 does:** PDF → Ghostscript **text extraction** (`gs -sDEVICE=txtwrite`, zero API cost) → load known services from `parish_data.json` → build change-detection prompt ("what changed?") → Claude Sonnet 4 **text mode** (single API call for all pages combined) → post-process false modifications → store confirmed/modified/not_found/new in Supabase `bulletin_changes` table.

**V2 results (12 test churches):**
- Confirmation rate: **100%** on all services present in the bulletin
- Cost: **$0.03/church average** (10x cheaper than V1)
- No multi-church bleeding (separate prompt strategies with strict attribution rules)
- No Vision dependency (text extraction is free)
- WordPress/image-only bulletins identified early and routed to fallback path

**Why V2 works:** Instead of "extract everything from an image," V2 says "here are the 25 services we know about; here's the bulletin text; tell me which ones you can confirm." This eliminates categorization errors, day/time parsing errors, duplicate extraction, and multi-church bleeding because the model is matching against known-good data rather than inventing structure.

**Key files:**
| V1 file | V2 replacement | Purpose |
|---------|---------------|---------|
| `prompt.js` (37K) | `prompt-v2.js` (8.5K) | Extraction → change detection |
| `parse-page.js` (31K) | Not needed | Post-processing eliminated |
| `pdf-to-images.js` | `extract-text.js` | Vision → text extraction |
| `store-results.js` | `store-results-v2.js` | `bulletin_items` → `bulletin_changes` |
| `review-ui.html` | `review-v2.html` | Updated review UI |
| `index.js` | `index-v2.js` | Batch orchestrator |

**V1 code is retained** in the repo for reference but should not be used for new development.

### 1.2 Weekday/Daily Expansion

**What we had:** 66 services across the dataset used consolidated `day: "weekday"` (Mon-Fri) or `day: "daily"` (all 7 days) values. A single row represented 5–7 actual service occurrences.

**What went wrong:** In multi-church parishes, a consolidated "weekday" Mass is ambiguous — does Monday happen at Church A and Tuesday at Church B? The AI couldn't reliably attribute individual days to specific locations. The audit comparison logic also couldn't match "weekday" in `parish_data.json` against "monday, tuesday, wednesday..." in extracted data, causing false "missing" counts.

**What we did:** Migration script `scripts/expand-weekday-services.js` expanded all 66 consolidated entries to individual day rows. Service count went from ~1,408 to ~1,690. Each service now has exactly one day, one time, one location.

**Why it's permanent:**
- Eliminates attribution ambiguity for multi-church parishes
- Makes AI change detection binary ("is Monday 8:30 AM confirmed? yes/no")
- Allows per-day modifications without splitting consolidated entries
- Frontend auto-collapses 3+ identical weekday entries into "Mon – Fri" for display

**Deprecated values:** `weekday` and `daily` are removed from the schema. `data-standards-compact.js` DAYS array does not include them. The V2 prompt explicitly instructs: "Use individual day values (monday, tuesday, etc.) for each occurrence. Never use 'weekday' or 'daily'."

### 1.3 Single-Church vs Multi-Church Prompt Split

**What we tried first:** A single global prompt with multi-church rules embedded. Even with parish profiles saying "BSC = Blessed Sacrament, HTC = Holy Trinity," the model couldn't reliably separate services by church from a single prompt.

**What we did:** Split into two prompt strategies in `prompt-v2.js`:

- **`buildSingleChurchPrompt()`** — Clean, focused, no disambiguation. Used when a parish has 1 worship site (church or chapel).
- **`buildMultiChurchPrompt()`** — Column-aware, strict attribution rules. Explicitly names the target location and sibling locations to exclude. Used when a parish has 2+ worship sites.

**Auto-classification:** `getChurchClassification()` in `load-services.js` (lines 159–197) counts worship sites from `parish.locations` where `type === 'church' || type === 'chapel'`. If 2+, it's multi-church. This is auto-derived from `parish_data.json` — no manual tagging required.

**SEAS Northampton fix:** The initial classification only counted `type: "church"`. SEAS Northampton has one church + one chapel (2 worship sites) but was misclassified as single-church. Fixed by including `type: "chapel"` in the count (line 173 of `load-services.js`).

**Manual override:** `parish-profiles.json` can set `target_location` and `sibling_locations` to override auto-classification. Used for Blessed Sacrament (abbreviations: BSC/HTC/PAC) and St. Agnes (named locations: "St. Agnes" / "St. Patrick's").

### 1.4 Bulletin Source Classification

**Finding:** Not all bulletin sources are equal. `classify-sources.js` categorizes every parish:

| Category | How it works | V2 compatible? |
|----------|-------------|----------------|
| `lpi` (parishesonline.com) | Digitally typeset PDFs, text-extractable | Yes |
| `church_bulletin_org` | Predictable URL pattern `{id}/{YYYY-MM-DD}.pdf`, auto-fetchable | Yes |
| `self_hosted` | Parish websites, manual PDF download | Yes (with manual drop) |
| `bulletin_service` | bonventure.net, pilotbulletins.net | Yes (need fetcher) |
| `wordpress` | Image-based, no PDF | No — needs Vision fallback |
| `no_url` | No bulletin URL on file | No |

**Key insight:** LPi and Diocesan (church-bulletin.org) PDFs are digitally typeset with consistent formatting. Ghostscript `txtwrite` extracts clean text at zero cost. This covers the majority of parishes.

**WordPress/image-only parishes** are identified by `extract-text.js` returning `method: "vision_needed"`. These need a separate path (not yet implemented — see Open Questions).

---

## 2. Rock Solid

Proven across multiple validation rounds. Do not revisit or second-guess.

### 2.1 One Row Per Day — No Consolidation

Every service occurrence gets its own record. Monday 8:00 AM and Tuesday 8:00 AM are two records, not one "weekday" record. See `DATA_STANDARDS.md` section "One Row Per Day." The frontend auto-collapses visually.

### 2.2 Text-First Extraction Over Vision

Ghostscript `txtwrite` is the primary extraction method. It's free, deterministic, and produces clean text from digitally typeset PDFs. Vision is a fallback for image-only sources, not the default path. The V1 audit proved Vision cannot reliably extract structured data from bulletin images at scale.

### 2.3 Change Detection Over Blind Extraction

The V2 prompt says "here's what we know; what changed?" not "extract everything." This eliminates: categorization errors (the known schedule already has correct types), day/time parsing errors (comparing against known values), duplicate extraction (known services are pre-deduped), and over-extraction (no open-ended extraction target).

### 2.4 Saturday Mass Cutoff: 2:00 PM

Saturday Mass at 14:00 or later → `type: "sunday_mass"` (vigil). Before 14:00 → `type: "daily_mass"`. This is a liturgical rule codified in `DATA_STANDARDS.md`, enforced in the V1 `parse-page.js` (Saturday title fix logic), and specified in both V2 prompt strategies.

### 2.5 Service Worker Cache Versioning

`CACHE_NAME` in `sw.js` must be bumped on every code deployment. Format: `massfinder-v2_YYYYMMDD_NN`. Desktop Chrome incognito is ground truth for testing. Different devices hold different cached versions — there's no way to force a global refresh.

### 2.6 Schema Validation in CI

`parish_data.schema.json` (JSON Schema draft-07) is validated on every push to `main` via GitHub Actions (`ajv validate`). Deployment is blocked if validation fails. This is the hard guardrail preventing malformed data from reaching production.

### 2.7 `clergy` Array, Not `staff`

`clergy` array holds actual people with roles (pastor, deacon). `staff` is legacy tags only. Keep lead priest + one deacon for new entries. 13 valid roles defined in `DATA_STANDARDS.md`.

### 2.8 Benediction Folding Rule

Standalone Benediction → `type: "benediction"`. Benediction paired with Adoration → fold into the `adoration` entry as a note. Never create a separate `benediction` entry when it's part of an Adoration block.

### 2.9 `parish_data.json` as Source of Truth

All service data flows from `parish_data.json`. Supabase tables (`churches`, `services`) are downstream copies synced via migration scripts. The JSON file is validated by schema, versioned in Git, and human-editable. Never edit Supabase tables directly for permanent schedule data.

---

## 3. Working / Monitoring

Things that work today but have known limitations or edge cases.

### 3.1 Ghostscript Text Extraction Quality

**Status:** Works well for LPi and Diocesan PDFs. Quality assessment in `extract-text.js` (`assessQuality()`, lines 126–148) checks alpha character counts: ≥100 on page 1 = "good", 50–99 = check pages 2–3, <50 = check pages 2–3 or mark "empty."

**Watch for:** Self-published bulletins with unusual fonts or embedded images-as-text may produce degraded output. The `text.replace(/   +/g, ' ')` on line 41 collapses multi-column layouts into single-space-separated text — this works for most layouts but could merge unrelated columns in complex two-column designs.

**Action if degraded:** Add the church to the Vision fallback list (not yet implemented). For now, monitor `text_quality` field in the `bulletins` table.

### 3.2 Multi-Church Attribution in V2

**Status:** The split prompt strategy (`buildMultiChurchPrompt()`) correctly handles tested parishes (Blessed Sacrament, St. Agnes).

**Watch for:** Parishes where the column layout in extracted text doesn't clearly separate churches. Ghostscript `txtwrite` interleaves text from adjacent columns, so "BSC: 8:30 AM  HTC: 9:00 AM" might extract as "BSC: 8:30 AM HTC: 9:00 AM" (spaces collapsed). The prompt instructs the model about two-column layouts, but the text representation may not preserve the visual separation.

**Action if attribution fails:** Add the parish to `parish-profiles.json` with `known_recurring` hints to anchor the model, or consider a per-location filtering step in post-processing.

### 3.3 Skip Pages via Parish Profiles

**Status:** `parish-profiles.json` supports `skip_pages` arrays. St. Joseph skips page 2 (Mass intentions), St. Agnes skips page 5 (JSON parse errors), St. Michael skips page 2 ("This Week" calendar duplicating page 1 schedule).

**Watch for:** Bulletin format changes that move schedule content to different pages. If extraction starts missing services, check whether `skip_pages` is now suppressing a page that contains the schedule.

**Action if suspected:** Manually extract text from the PDF and inspect each page's content. Update `skip_pages` and `schedule_pages` in the profile.

### 3.4 Auto-Confirm Threshold

**Status:** `CONFIDENCE_AUTO_APPROVE` in `config.js` is set to 0.95. In `store-results-v2.js`, confirmed and not_found items are stored with `status: 'auto_confirmed'`; modified, new_services, events, and notices are `status: 'pending'` for human review.

**Watch for:** If the model starts reporting false confirmations (confirming a service that actually changed), the auto-confirm path bypasses human review. This hasn't happened in testing but would be a silent failure.

**Action:** Periodically spot-check auto-confirmed items against the actual bulletin text. If false confirmation rate exceeds ~2%, add a sampling audit step.

### 3.5 False Modification Filter

**Status:** `test-v2.js` (lines 173–189) and `index-v2.js` (lines 224–239) filter modifications where `old_value === new_value` (after whitespace normalization) and move them to confirmed.

**Watch for:** Modifications where the values are semantically the same but syntactically different (e.g., "8:00" vs "08:00", "Church" vs "church"). Currently only exact-string comparison after whitespace normalization. May need case-insensitive or time-format-aware comparison.

### 3.6 church-bulletin.org Auto-Fetching

**Status:** `fetch-bulletin.js` (`fetchChurchBulletinOrg()`, lines 61–98) constructs PDF URLs from the query parameter `id` in the parish's `bulletin_url`, trying this Sunday and last Sunday's dates.

**Watch for:** church-bulletin.org URL structure changes, date format changes, or parishes switching to a different bulletin platform. The 2-Sunday lookback means bulletins published more than a week late will be missed.

**Action if fetch fails:** Check the parish's `bulletin_url` manually. If the URL structure changed, update `fetchChurchBulletinOrg()`. If the parish moved to a new platform, update `bulletin_url` in `parish_data.json` and reclassify.

---

## 4. Open Questions

Unresolved design decisions that need careful thought before implementation.

### 4.1 Source Provenance Field

**Problem:** Some services in `parish_data.json` were manually entered from sources other than the digital bulletin — e.g., Stations of the Cross times from a physical Lenten calendar posted in the church vestibule, or a confession time from the diocese website. The V2 pipeline flags these as `not_found` every week because they never appear in the bulletin text.

**Why it matters:** Persistent `not_found` results create noise in the review queue. The operator sees "6 services not found" and has to remember which ones are expected absences vs. genuine schedule removals.

**Options considered:**

1. **Add `source` field to service schema** — Values like `"bulletin"`, `"manual"`, `"website"`, `"diocese"`. V2 pipeline only expects `source: "bulletin"` services in the bulletin text. Others are excluded from the change-detection prompt.
   - Pro: Clean separation. Pipeline becomes self-documenting.
   - Con: Requires schema migration, backfilling ~1,690 services (most would be `"bulletin"`), and updating `load-services.js` to filter by source.

2. **Add `exclude_from_pipeline` boolean** — Simpler flag. If `true`, service is excluded from V2 comparison.
   - Pro: Minimal schema change. Easy to set on individual services.
   - Con: Doesn't capture *why* it's excluded. Future automation (e.g., website scraping) would need to know the actual source.

3. **Handle in profiles, not schema** — Add `expected_not_found` service IDs to `parish-profiles.json`. Pipeline moves these from `not_found` to `expected_absent` silently.
   - Pro: No schema change. Easy to maintain per-parish.
   - Con: Coupling profile data to specific service IDs. If services are re-IDed, profiles break.

**What needs to be true for option 1:** The schema migration must be backward-compatible (new field is optional, defaults to `"bulletin"`). The `load-services.js` filter should default to including all services (no breakage if source is missing).

**Recommendation:** Option 1 is the cleanest long-term. The `source` field has value beyond the pipeline — it documents data provenance for auditing and contributor onboarding.

### 4.2 Vision Fallback Path for Image-Only Bulletins

**Problem:** WordPress-hosted bulletins (Our Lady of Czestochowa) and any future image-only sources can't use the text extraction path. `extract-text.js` returns `method: "vision_needed"` for these.

**Options:**

1. **Hybrid V2 — text prompt with Vision input.** Send the change-detection prompt (known services + "what changed?") but attach the bulletin images instead of extracted text. Cost: ~$0.25–0.50/church (Vision input tokens).
   - Pro: Keeps the change-detection architecture. May work better than V1 Vision because the model is anchored to known services.
   - Con: Untested. Vision + long prompt may still miss sidebar/small-text items.

2. **Manual-only for image sources.** Skip automated parsing for WordPress parishes. Operator manually checks the bulletin and updates `parish_data.json`.
   - Pro: No development needed. These are likely a small percentage of parishes.
   - Con: Doesn't scale. Operator burden increases as parish count grows.

3. **OCR preprocessing.** Use Tesseract or similar OCR on the images, then feed the OCR text into the V2 text-mode pipeline.
   - Pro: Reuses the proven V2 text pipeline.
   - Con: OCR quality on bulletin images (multi-column, decorative fonts, colored backgrounds) may be poor.

**Decision deferred.** Need to know how many parishes fall into this category first (`classify-sources.js --fetch` will report). If it's <5%, manual-only is acceptable for now.

### 4.3 Event Extraction Maturity

**Problem:** V2 handles events (one-time/limited-run) in the `events` output bucket, but there's no automated path from `bulletin_changes.change_type = 'event'` to `events.json`. Events are extracted and stored in Supabase but require manual creation in `events.json`.

**What needs resolving:**
- Should events auto-populate `events.json` after human approval?
- How to handle recurring events that look one-time in a single bulletin (e.g., weekly fish fry listed with next week's date)?
- Dedup against existing events in `events.json`?

**Current stance:** Events remain a human-review task. The pipeline extracts them for visibility, but the operator creates the actual `events.json` entries manually. Automate only after the service confirmation pipeline is fully stable.

### 4.4 eCatholic.com as a Data Source

**Problem:** An estimated 10–20% of target parishes use eCatholic.com for their websites. These sites have structured schedule data that could theoretically be scraped.

**Status:** Goal and approach TBD. No code written. Need to assess eCatholic.com's structure, rate limiting, and terms of service before committing.

---

## 5. Conventions & Methodology

The rules for how we make changes.

### 5.1 Doc First, Code Second

If a convention isn't written in `DATA_STANDARDS.md` or this runbook, it doesn't exist. When a new pattern is discovered:
1. Flag it: "This isn't covered."
2. Propose a convention.
3. Mike approves → update the doc.
4. Implement the code.

### 5.2 When to Add a Field vs. Derive It

**Add a field** when:
- The information cannot be reliably computed from existing fields
- Multiple consumers need the same derived value (avoid duplication of logic)
- The value originates from a human decision, not a computation

**Derive it** when:
- The value is a pure function of existing fields (e.g., multi-church classification from `locations.length`)
- Adding a field would create a synchronization burden (field could get stale)

**Example of getting this right:** Multi-church classification is auto-derived from `parish_data.json` in `getChurchClassification()`. No manual tagging needed. But `target_location` abbreviations (BSC, HTC) require manual profile entries because the abbreviation is a human convention, not derivable from the data.

### 5.3 When to Split vs. Consolidate

**Split** when:
- Different code paths have fundamentally different logic (single-church vs. multi-church prompts)
- A combined function exceeds ~200 lines or has >3 nested conditionals
- Test cases differ meaningfully between paths

**Consolidate** when:
- Logic is truly shared (the `buildTaskSection()` in `prompt-v2.js` is shared between both prompt strategies)
- Two things are conceptually one thing (a service is one row, not a weekday-group)

### 5.4 Batch Size for Changes

When adding new parishes to `parish_data.json`, the established batch size is **10 churches per JSON fragment**. This keeps diffs reviewable and limits blast radius if data has errors. Connecticut churches start at `parish_080+`.

### 5.5 Validation Protocol

Before any push to `main`:
1. `node --check` on any modified `.js` files (catches syntax errors on Node 12)
2. `npx ajv validate -s parish_data.schema.json -d parish_data.json` (schema compliance)
3. Cross-reference service counts: `metadata.total_services` must match the actual count
4. Spot-check 2–3 parishes that were modified

### 5.6 Testing Discipline

- **Ground truth:** Desktop Chrome incognito (bypasses service worker)
- **Multi-environment:** Desktop Safari, Desktop Chrome (normal + incognito), Mobile Safari, Mobile Chrome, installed PWA
- **Hard refresh** between tests when not in incognito
- **Service worker versioning:** Bump `CACHE_NAME` for any code change

### 5.7 Cost Budgeting

V2 pipeline target: <$0.05/church/run. At 93 parishes, a full weekly run should cost <$5.

V1 was ~$0.35/church — 7× more expensive and 57% accurate. V2 is ~$0.03/church and 100% accurate on tested parishes.

If a change would push per-church cost above $0.10, it needs explicit justification (e.g., Vision fallback for image-only sources).

---

## 6. Procedures

Step-by-step protocols for common operations.

### 6.1 Adding a New Church to the Pipeline

1. **Ensure the parish exists in `parish_data.json`** with complete service data, correct `locations` array, and valid `bulletin_url`.

2. **Add to `parish_to_church_map.json`:** Map `parish_id` → primary church `location.id`.
   ```json
   "parish_080": "st-example-church-hartford"
   ```

3. **Classify the bulletin source:** Run `node scripts/bulletin-parser/classify-sources.js` and check the parish's category. If `wordpress` or `no_url`, the text path won't work — see Open Question 4.2.

4. **Create a parish profile** (if needed) in `parish-profiles.json`:
   - Required if multi-church (set `target_location`, `sibling_locations`)
   - Required if skip pages are known (set `skip_pages`)
   - Optional but helpful: `known_recurring`, `parsing_notes`

5. **Test with dry run:**
   ```bash
   # Drop the PDF in bulletins-manual/ for testing
   node scripts/bulletin-parser/test-v2.js st-example-church-hartford --dry-run
   ```
   Review the generated prompt. Verify the service table is correct and complete.

6. **Test with live API call:**
   ```bash
   node scripts/bulletin-parser/test-v2.js st-example-church-hartford
   ```
   Review the results. Check: confirmed count, not_found count, any false modifications.

7. **Add to pilot list** in `config.js` `PILOT_CHURCHES` array (if running batch).

8. **Validate schema:** `npx ajv validate -s parish_data.schema.json -d parish_data.json`

### 6.2 Handling a New Bulletin Format

When a church switches bulletin platforms or formats:

1. **Fetch a sample bulletin.** Download the PDF manually and place in `bulletins-manual/{church-id}.pdf`.

2. **Test text extraction:**
   ```bash
   # The test-v2.js script extracts text automatically
   node scripts/bulletin-parser/test-v2.js {church-id} --dry-run
   ```
   Check the `text_quality` output. If "empty" or "low", the PDF may be image-based.

3. **If text quality is good:** Proceed normally. Update `bulletin_url` if the URL changed.

4. **If text quality is low/empty:** The church needs Vision fallback (not yet implemented). For now, add to the manual-review-only list.

5. **Update the parish profile** if page structure changed (new `skip_pages`, updated `parsing_notes`).

### 6.3 Adding a New Service Type

1. **Add to `DATA_STANDARDS.md`** — document the type, when to use it, what it replaces.

2. **Add to `parish_data.schema.json`** — in the `service_type` enum.

3. **Add to `data-standards-compact.js`** — in the `SERVICE_TYPES` array.

4. **Add to V1 `prompt.js`** `SERVICE_CATEGORIES` array (if V1 code is still referenced).

5. **Run schema validation** to ensure no existing data conflicts.

6. **No prompt change needed for V2** — the prompt injects `STANDARDS.SERVICE_TYPES` dynamically from `data-standards-compact.js`. The new type will appear in the `new_services` valid types list automatically.

### 6.4 Making Schema Changes

1. **Edit `parish_data.schema.json`** with the change.

2. **Validate existing data against the new schema** — if it breaks, the change is not backward-compatible. Either provide a migration script or make the new field optional with a default.

3. **Update `DATA_STANDARDS.md`** to document the new field/constraint.

4. **Update `data-standards-compact.js`** if the change affects enum values used in prompts.

5. **Test:** `npx ajv validate -s parish_data.schema.json -d parish_data.json`

6. **Push to `dev` first.** Verify the CI validation passes. Then PR to `main`.

### 6.5 Running a Full Pipeline Batch

```bash
# All pilot churches
node scripts/bulletin-parser/index-v2.js

# All pilot churches with Supabase storage
node scripts/bulletin-parser/index-v2.js --store

# Single church
node scripts/bulletin-parser/index-v2.js --church blessed-sacrament-church-greenfield

# Dry run (no API calls, just prints prompts)
node scripts/bulletin-parser/index-v2.js --dry-run
```

Results are written to `.tmp-v2-batch-results.json` in the repo root.

**Expected output per church:**
- `confirmed: X/Y` — X services confirmed out of Y known
- `modified: N` — services with changed times/details (pending human review)
- `not_found: N` — services not mentioned in this bulletin (informational, not alarming)
- `new_services: N` — potentially new recurring services (pending human review)
- `events: N` — one-time events found (pending human review)

### 6.6 Deploying Changes

1. Commit to `dev` branch.
2. Push. Vercel auto-deploys to `massfinderdev.vercel.app`.
3. Test on staging.
4. Open PR from `dev` → `main`.
5. CI runs schema validation.
6. Merge. Vercel auto-deploys to `massfinder.com`.
7. **Bump `CACHE_NAME` in `sw.js`** if any frontend code changed.

---

## 7. Anti-Patterns

Things that look reasonable but have burned us. Each includes the pattern, why it seems right, and what actually happens.

### 7.1 "Just Use Vision — It Can See Everything"

**Why it seems right:** Claude Vision can read bulletin images. Bulletins are visual documents. Vision should be able to extract all the data.

**What actually happens:** At 57% accuracy across 10 churches. Vision misses small-text sidebars, confuses multi-church schedules, hallucinates service times from nearby Mass intention lists, can't process WordPress-hosted images at all, and costs 10× more than text extraction. Vision is a fallback, not a primary path.

### 7.2 "Consolidate Mon-Fri Into One `weekday` Row"

**Why it seems right:** Five identical rows for the same Mass at the same time feels redundant. One row is cleaner.

**What actually happens:** Multi-church parishes can't attribute individual days to specific locations. AI change detection becomes ambiguous ("did Tuesday change, or all weekdays?"). The `weekday` → individual day expansion migration (`expand-weekday-services.js`) was a non-trivial data surgery affecting 66 entries across many parishes. The frontend handles display compression automatically.

### 7.3 "One Prompt Can Handle All Church Types"

**Why it seems right:** Simpler codebase, one set of rules, one test surface.

**What actually happens:** Multi-church bulletins have fundamentally different layouts (two-column, abbreviated location codes, parish-wide summaries vs. church-specific breakdowns). A single prompt with multi-church rules added as conditions creates confusion for simple single-church bulletins (unnecessary rules to process) and is insufficient for complex multi-church bulletins (not enough context). The split prompt was the breakthrough that solved multi-church bleeding.

### 7.4 "Extract Everything, Then Filter"

**Why it seems right:** Cast a wide net, then post-process to remove noise. You can always throw away data; you can't extract what you didn't look for.

**What actually happens:** V1 over-extraction was massive: Blessed Sacrament had 62 raw items from page 1 alone. St. Mary's had 32. Even aggressive dedup couldn't eliminate all false positives. The post-processing pipeline (`parse-page.js`, 31K of sanitization logic) became more complex than the extraction itself. V2's "confirm what we know" approach eliminates the entire filtering stage.

### 7.5 "Process Each Page Independently for Simplicity"

**Why it seems right:** Isolation prevents cross-page contamination. Each page is a clean extraction unit.

**What actually happens:** Bulletins don't respect page boundaries. A Mass schedule on page 1 references a confession schedule on page 3. A devotion listed as a note on page 2 is actually the continuation of an adoration block on page 1. V2 solves this by combining all bulletin text into a single prompt, giving the model full context.

### 7.6 "Use `staff` for Pastor/Deacon Names"

**Why it seems right:** `staff` is already on the parish object.

**What actually happens:** `staff` is a legacy array of tags (`["pastor", "additional"]`), not actual people with names. Use `clergy` array: `[{role: "pastor", name: "Fr. John Smith"}]`. This has been a consistent source of confusion for new sessions.

### 7.7 "Higher DPI = Better Vision Extraction"

**Why it seems right:** More pixels = more detail for the model to read.

**What actually happens:** Vision tokens scale with image resolution. Going from 200 DPI to 300 DPI increases cost ~50% with marginal accuracy improvement. The real bottleneck was never image resolution — it was the extraction architecture (blind extraction vs. change detection). Text extraction at zero DPI cost outperforms Vision at any DPI.

### 7.8 "Write a Fetcher for Every Bulletin Platform"

**Why it seems right:** Automate bulletin retrieval for all parishes.

**What actually happens:** Every platform has unique URL patterns, authentication, layout, and failure modes. church-bulletin.org is predictable (`{id}/{date}.pdf`). parishesonline.com requires a separate scraper. WordPress needs image extraction. Self-hosted parishes are completely unpredictable. The manual drop folder (`bulletins-manual/`) is the reliable fallback. Build fetchers incrementally for the platforms that cover the most parishes.

### 7.9 "Put Community Events in `parish_data.json` as Service Types"

**Why it seems right:** Bible study is at the church every Wednesday — that's a recurring schedule item, just like Mass.

**What actually happens:** Services are indefinite-duration schedule items tied to liturgical or sacramental functions. Events expire. Mixing them means expired events pollute the service list, or you need expiration logic in the service schema. `events.json` has built-in expiration handling. Rule of thumb: if it has specific dates or a defined end, it's an event.

---

## 8. File Reference

Quick lookup for where things live and what they do.

### Pipeline (V2)

| File | Purpose | Key functions |
|------|---------|---------------|
| `scripts/bulletin-parser/index-v2.js` | Batch orchestrator | `processChurch()`, sequential processing |
| `scripts/bulletin-parser/test-v2.js` | Single-church test harness | CLI: `node test-v2.js <church-id> [--dry-run]` |
| `scripts/bulletin-parser/prompt-v2.js` | Change-detection prompts | `buildSingleChurchPrompt()`, `buildMultiChurchPrompt()`, `buildTaskSection()` |
| `scripts/bulletin-parser/load-services.js` | Load known services from parish_data.json | `getChurchContext()`, `getChurchClassification()`, `formatServicesForPrompt()` |
| `scripts/bulletin-parser/extract-text.js` | Ghostscript text extraction | `extractText()`, `assessQuality()` |
| `scripts/bulletin-parser/fetch-bulletin.js` | Download bulletins from various platforms | `fetchBulletin()`, `fetchChurchBulletinOrg()`, `fetchWordPressBulletin()` |
| `scripts/bulletin-parser/store-results-v2.js` | Write V2 results to Supabase | `storeV2Results()` → `bulletins` + `bulletin_changes` tables |
| `scripts/bulletin-parser/classify-sources.js` | Categorize parishes by bulletin source | CLI: `node classify-sources.js [--fetch]` |
| `scripts/bulletin-parser/data-standards-compact.js` | Canonical enum arrays for prompts | `SERVICE_TYPES`, `DAYS`, `EVENT_CATEGORIES`, `SEASONAL` |
| `scripts/bulletin-parser/config.js` | API keys, constants, pilot church list | `PILOT_CHURCHES`, `PARSE_MODEL`, `CONFIDENCE_AUTO_APPROVE` |
| `scripts/bulletin-parser/parish-profiles.json` | Per-church parsing context | `skip_pages`, `target_location`, `sibling_locations`, `known_recurring` |
| `scripts/bulletin-parser/diff-engine.js` | V1 week-over-week comparison | `markUnchanged()`, `fuzzyMatch()` |

### Pipeline (V1 — legacy, do not use for new development)

| File | Purpose |
|------|---------|
| `scripts/bulletin-parser/index.js` | V1 batch orchestrator |
| `scripts/bulletin-parser/prompt.js` | V1 Vision extraction prompt (37K, ~8K tokens) |
| `scripts/bulletin-parser/parse-page.js` | V1 post-processing (31K of sanitization) |
| `scripts/bulletin-parser/pdf-to-images.js` | Ghostscript PNG rendering for Vision |
| `scripts/bulletin-parser/store-results.js` | V1 Supabase storage (`bulletin_items`) |

### Data

| File | Purpose |
|------|---------|
| `parish_data.json` | Source of truth: 93+ parishes, ~1,690 services |
| `parish_data.schema.json` | JSON Schema (draft-07) for validation |
| `parish_to_church_map.json` | Maps `parish_id` → primary church `location.id` |
| `events.json` | Community events, YC events |
| `DATA_STANDARDS.md` | Authoritative data conventions |

### Supabase Migrations

| File | Purpose |
|------|---------|
| `supabase/migrations/001_initial_schema.sql` | Base tables: `churches`, `services`, `events` |
| `supabase/migrations/002_bulletin_tables.sql` | `bulletins`, `bulletin_items` tables |
| `supabase/migrations/003_bulletin_items_v2.sql` | V2 columns on `bulletin_items` |
| `supabase/migrations/004_bulletin_items_day.sql` | `day` column on `bulletin_items` |
| `supabase/migrations/005_v2_changes.sql` | `bulletin_changes` table + `bulletins` v2 columns |

### Frontend & Infrastructure

| File | Purpose |
|------|---------|
| `index.html` | Main PWA (~3,200 lines) |
| `admin.html` | Parish data editor (~2,400 lines) |
| `sw.js` | Service worker (cache-first shell, stale-while-revalidate data) |
| `manifest.json` | PWA manifest |
| `vercel.json` | Vercel configuration |
| `.github/workflows/validate.yml` | CI: schema validation on push to `main` |

---

## 9. Glossary

| Term | Meaning |
|------|---------|
| **BSC / HTC / PAC** | Blessed Sacrament Church / Holy Trinity Church / Our Lady of Peace Adoration Chapel — abbreviations for the Blessed Trinity Parish cluster in Greenfield |
| **church-bulletin.org** | Automated bulletin hosting platform. PDFs at predictable URLs. |
| **LPi** | Liturgical Publications Inc. Publishes bulletins via parishesonline.com. Digitally typeset PDFs. |
| **Cluster parish** | A parish with multiple worship sites (churches + chapels) sharing one bulletin |
| **Not_found** | V2 pipeline status meaning a known service was not mentioned in this week's bulletin. Informational, not an error. |
| **Source of truth** | `parish_data.json` for services, `events.json` for events |
| **TLM** | Traditional Latin Mass |
| **V1** | Vision-based extraction pipeline (deprecated, 57% accuracy) |
| **V2** | Text-first change-detection pipeline (current, 100% on pilot) |
| **Vigil Mass** | Saturday Mass at 14:00 or later. Modeled as `type: "sunday_mass", day: "saturday"` |
