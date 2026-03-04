# MassFinder — Project Context

## Architecture
MassFinder is a **static, vanilla JS progressive web app** — no framework, no backend, no database. Everything runs client-side.

## Key Files

| File | Purpose | Size |
|------|---------|------|
| `index.html` | Public-facing PWA (HTML + CSS + JS, all-in-one) | ~3,200 lines |
| `admin.html` | Parish data editor (client-side, password-gated) | ~2,400 lines |
| `parish_data.json` | All parish data: 96 parishes, ~1,420 services | Source of truth |
| `events.json` | Community events + YC events (~88 events) | Separate from services |
| `parish_data.schema.json` | JSON Schema (draft-07) for parish_data.json | Validated in CI |
| `sw.js` | Service worker (cache-first shell, stale-while-revalidate data) | ~70 lines |
| `manifest.json` | PWA manifest | |
| `DATA_STANDARDS.md` | Authoritative data conventions — **read this for data rules** | |
| `CONTRIBUTING.md` | Contributor guide, branch workflow, local dev | |
| `scripts/prep-review.js` | Pre-PR data review script | |

## Data Model

### Services (parish_data.json)
Recurring schedule items: Mass, Confession, Adoration, Rosary, etc.
- Key fields: `id`, `type`, `day`, `time`, `end_time`, `location_id`, `language`, `notes`, `seasonal`, `recurrence`
- Day value `"weekday"` (singular, not "weekdays") = Mon-Fri
- First Friday/Saturday: `day: "first_friday"` + actual `type` (e.g., `daily_mass`, `adoration`)
- Saturday vigil: `type: "sunday_mass"`, `day: "saturday"`
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
- Role ranking: pastor > pastor_and_director > provisional_priest > deacon > deacon_emeritus > deacon_retired

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
