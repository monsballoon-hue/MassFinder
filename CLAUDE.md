# MassFinder — Project Context

## Architecture
MassFinder is a **vanilla JS progressive web app** with a **Supabase backend**. The frontend is framework-free (HTML + CSS + JS in single files). Data lives in both flat JSON files (source of truth for parish data) and Supabase (API-served to the frontend, plus bulletin parsing pipeline storage).

### Data Flow
```
parish_data.json / events.json  →  Supabase tables (churches, services, events)
                                →  Frontend fetches via Supabase REST API
Bulletin PDFs  →  Claude Vision API  →  bulletin_items table (Supabase)
               →  Human review UI  →  Approved items merge into parish data
```

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Public-facing PWA (HTML + CSS + JS, all-in-one, ~3,200 lines) |
| `admin.html` | Parish data editor (client-side, password-gated, ~2,400 lines) |
| `parish_data.json` | All parish data: 93 parishes, ~1,407 services — source of truth |
| `events.json` | Community events + YC events (~203 events) |
| `parish_data.schema.json` | JSON Schema (draft-07) for parish_data.json — validated in CI |
| `sw.js` | Service worker (cache-first shell, stale-while-revalidate data) |
| `manifest.json` | PWA manifest |
| `DATA_STANDARDS.md` | **Authoritative data conventions — read this first for data rules** |
| `CONTRIBUTING.md` | Contributor guide, branch workflow, local dev |

### Bulletin Parser Pipeline

| File | Purpose |
|------|---------|
| `scripts/bulletin-parser/prompt.js` | Claude Vision extraction prompt (categories, rules, output schema) |
| `scripts/bulletin-parser/parse-page.js` | Post-parse sanitization (category validation, heuristic reclassification, blob splitting) |
| `scripts/bulletin-parser/store-results.js` | Writes parsed items to Supabase `bulletin_items` table |
| `scripts/bulletin-parser/review-ui.html` | Web-based human review UI (approve/reject/edit parsed items) |
| `scripts/bulletin-parser/review-server.js` | Express server for review UI (serves API, validates on write) |
| `scripts/bulletin-parser/config.js` | API keys, Supabase connection config |
| `scripts/bulletin-parser/parish-profiles.json` | Per-parish context for Claude Vision (known services, language, etc.) |

### Supabase

- Project: `mgbhmwnaipopdctbihmf.supabase.co`
- Credentials: `.env.local`
- Key tables: `churches`, `services`, `events`, `bulletin_items`
- API pagination: Supabase caps at 1000 rows/request — services use range-based pagination (two parallel requests)

## Data Model

### Services (parish_data.json)
Recurring schedule items. 24 service types:

**Mass:** `sunday_mass`, `daily_mass`, `communion_service`
**Sacraments:** `confession`, `anointing_of_sick`
**Adoration:** `adoration`, `perpetual_adoration`
**Devotions:** `holy_hour`, `rosary`, `divine_mercy`, `stations_of_cross`, `miraculous_medal`, `novena`, `benediction`, `vespers`, `gorzkie_zale`, `devotion`, `blessing`, `prayer_group`
**Holy Week:** `holy_thursday_mass`, `good_friday_service`, `easter_vigil_mass`, `palm_sunday_mass`, `easter_sunday_mass`

Key fields: `id`, `type`, `day`, `time`, `end_time`, `location_id`, `language`, `languages`, `notes`, `seasonal`, `recurrence`

Key rules:
- Day value `"weekday"` (singular, not "weekdays") = Mon-Fri
- First Friday/Saturday: `day: "first_friday"` + actual `type` (e.g., `daily_mass`, `adoration`)
- Saturday vigil: `type: "sunday_mass"`, `day: "saturday"` — cutoff is 2:00 PM
- Holy Day Masses: `type: "daily_mass"` with `day: "holyday"` or `"holyday_eve"`
- Bilingual: `languages: ["es", "en"]` array takes precedence over `language` for filtering
- See DATA_STANDARDS.md for full conventions

### Events (events.json)
Time-bounded happenings: social, educational, liturgical, volunteering, YC.
- Categories: `yc`, `community`, `social`, `fellowship`, `educational`, `liturgical`, `devotional`, `volunteering`
- Scheduling: `date` (one-time) XOR `dates` (multi-date array) XOR `day` (recurring weekly)
- Expiration: `end_date`, or falls off after last `date`/`dates` entry
- See DATA_STANDARDS.md for full conventions

### Clergy (on parish objects)
- `clergy` array: `[{role, name, email}]` — actual people with roles
- `staff` array: legacy tags like `["pastor", "additional"]` — **do not use for display**
- Keep **lead priest + one deacon** only when adding new entries
- Common roles: `pastor`, `administrator`, `provisional_priest`, `deacon`, `deacon_emeritus`, `deacon_retired`
- See DATA_STANDARDS.md for the full list of 13 valid roles

## Design Conventions
- **Apple Human Interface Guidelines** — the design standard throughout
- Fonts: Playfair Display (headings), Source Sans 3 (body)
- CSS custom properties for everything: `--color-*`, `--space-*`, `--text-*`, `--radius-*`, `--shadow-*`
- Cards with `var(--shadow-card)`, rounded corners `var(--radius-md)`
- Gold accent: `var(--color-accent)` / `#B8963F`
- Lenten purple: `#7C3AED`
- Progressive disclosure via `<details>/<summary>` pattern

## Deployment
- **Vercel** (free tier), auto-deploys from GitHub
- Production: `massfinder.com` (tracks `main`)
- Staging: `massfinderdev.vercel.app` (tracks `dev`)
- Branches: `dev` (staging) → `main` (production)
- Always work on `dev`, PR into `main`
- **GitHub Actions** CI: runs `ajv validate` against parish_data.schema.json

## Common Gotchas
- **Service worker cache**: Bump `CACHE_NAME` in `sw.js` after any code change, or returning users won't see updates
- **Schema validation**: `parish_data.schema.json` uses JSON Schema draft-07. CI will fail if data doesn't match
- **Day value**: It's `"weekday"` (singular), never `"weekdays"`
- **Events vs services**: Community groups, Bible studies, social gatherings go in `events.json`, not as service types
- **`staff` vs `clergy`**: Use `clergy` array for pastor/deacon names. `staff` is legacy tags only.
- **Web3Forms**: Used for verify/correction/interest submissions. API key is in index.html. `api.web3forms.com` is in SW's network-only list.
- **Node.js on this machine**: v12 (old) — `??` and `?.` syntax won't pass `node --check` but works fine in browsers
- **Supabase row limit**: Max 1000 rows per request — use range-based pagination for large tables
- **Seasonal values**: Most services use `year_round`. Seasonal values: `lent`, `advent`, `holy_week`, `easter_season`, `academic_year`, `summer`. Never use deprecated `christmas` or `easter`
