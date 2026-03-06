# MassFinder Developer Cheat Sheet

Quick reference for working with Claude Code on this repo. For full conventions, see `DATA_STANDARDS.md`.

---

## How the Docs Work

| File | Role | Loaded Automatically? |
|------|------|-----------------------|
| `CLAUDE.md` | Project context (architecture, counts, gotchas) | Yes — every conversation |
| `DATA_STANDARDS.md` | Authoritative data conventions (the bible) | No — say "read DATA_STANDARDS.md" |
| `CONTRIBUTING.md` | Contributor onboarding guide | No |
| `review/validation-checklist.md` | Per-parish validation runbook | No |
| `review/validation-findings.md` | Historical validation results + resolved questions | No |
| `project_plans/ROADMAP.md` | Master plan (batches, status, vision) | No |
| `project_plans/INTEGRATIONS.md` | External service details (Supabase, Web3Forms, etc.) | No |

**CLAUDE.md is always loaded.** Everything else is on-demand. Tell Claude to read a file when the task needs it.

---

## When to Say What

| Situation | What to Say |
|-----------|------------|
| Routine code change | Just ask — CLAUDE.md loads automatically |
| Anything touching data structure | "Read DATA_STANDARDS.md first" |
| Bulletin parser changes | "Read prompt.js, parse-page.js, and DATA_STANDARDS.md" |
| Something feels wrong | "Check that against DATA_STANDARDS.md" |
| New edge case discovered | "Add a convention for [X] to DATA_STANDARDS.md, then implement" |
| Unsure about a rule | "What does DATA_STANDARDS.md say about [X]?" |
| Big feature or planning | "Read all project context docs before planning" |
| Validating a parish | "Read the validation checklist before starting" |

---

## The Compliance Loop

```
You ask for work
    |
Claude reads CLAUDE.md (automatic)
    |
Does the task touch data/parsing/validation?
    |
   YES --> Claude reads DATA_STANDARDS.md
    |       and validation-checklist.md
    |
Do the work, conforming to conventions
    |
New pattern not in docs?
    |
   YES --> Flag to you: "This isn't covered.
    |       Here's what I recommend."
    |
You approve --> update doc first --> implement
You reject  --> find alternative approach
```

**Rule: Doc first, code second.** If a convention isn't written down, it doesn't exist.

---

## Quick Data Rules (from DATA_STANDARDS.md)

### Service Types (24 total)
**Mass:** `sunday_mass`, `daily_mass`, `communion_service`
**Sacraments:** `confession`, `anointing_of_sick`
**Adoration:** `adoration`, `perpetual_adoration` (24/7 only)
**Devotions:** `holy_hour`, `rosary`, `divine_mercy`, `stations_of_cross`, `miraculous_medal`, `novena`, `benediction`, `vespers`, `gorzkie_zale`, `devotion`, `blessing`, `prayer_group`
**Holy Week:** `holy_thursday_mass`, `good_friday_service`, `easter_vigil_mass`, `palm_sunday_mass`, `easter_sunday_mass`

### Day Values (21 total)
`monday`-`sunday`, `weekday` (Mon-Fri), `daily` (all 7), `first_friday`, `first_saturday`, `holyday`, `holyday_eve`, `lent`, `good_friday`, `holy_thursday`, `holy_saturday`, `easter_vigil`, `palm_sunday`, `easter_sunday`, `civil_holiday`

### Seasonal Values
Default: `year_round`. Seasonal: `lent`, `advent`, `holy_week`, `easter_season`, `academic_year`, `summer`
Deprecated (never use): `christmas`, `easter`

### Common Traps

| Trap | Correct |
|------|---------|
| Saturday 9 AM Mass as `sunday_mass` | `daily_mass` (before 2 PM = daily) |
| Holy Day Mass as `sunday_mass` | `daily_mass` with `holyday` day |
| First Saturday Mass as `sunday_mass` | `daily_mass` with `first_saturday` day |
| Generic `devotion` for Divine Mercy | Use `divine_mercy` (specific type) |
| Benediction + Adoration as 2 entries | Fold benediction into adoration note |
| Mon-Thu as `weekday` | 4 individual entries (weekday = Mon-Fri) |
| "Confession after Mass" with no time | Estimate Mass start + 45 min, add note |
| Bilingual as `language: "en"` | Use `languages: ["es", "en"]` array |

---

## Event Categories (8 total)
`yc`, `community`, `social`, `fellowship`, `educational`, `liturgical`, `devotional`, `volunteering`

### Service vs Event Decision
- Weekly schedule, year after year --> **service** (parish_data.json)
- Specific dates, expires --> **event** (events.json)
- Bible study, social gathering --> **event**
- Mass, confession, adoration --> **service**

---

## Clergy Rules
- `clergy` array, not `staff`
- Lead priest + one deacon only (for new entries)
- Use `role` field, not `title`
- Common: `pastor`, `administrator`, `provisional_priest`, `deacon`
- Full list: 13 roles in DATA_STANDARDS.md

---

## Bulletin Parser Pipeline
```
PDF --> Claude Vision (prompt.js)
    --> parse-page.js (sanitize, flag, split blobs)
    --> store-results.js (Supabase bulletin_items)
    --> review-ui.html (human review)
    --> review-server.js (validation + write)
```

Key facts:
- `bulletin_items` table has NO `day` column
- Bilingual = comma-separated in bulletin_items (`"es,en"`)
- Bilingual = array in parish_data.json (`["es", "en"]`)
- Prompt uses generic `mass`; parse-page.js splits to `daily_mass`/`sunday_mass`

---

## Tech Constraints
- **Node.js v12** on this machine: no `??` or `?.` syntax in scripts
- **Supabase**: max 1000 rows/request (use range pagination)
- **Service worker**: bump `CACHE_NAME` in `sw.js` after code changes
- **Schema**: JSON Schema draft-07, CI validates on every push to `main`
- **Branch workflow**: always work on `dev`, PR into `main`
