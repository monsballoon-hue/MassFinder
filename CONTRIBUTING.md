# Contributing to MassFinder

MassFinder is a free Catholic Mass-finder PWA serving 93 parishes across Western New England (MA, CT, VT, NH). This guide covers everything you need to get started as a contributor.

---

## Project Overview

MassFinder is a **vanilla JS progressive web app** with a **Supabase backend**. No frameworks, no build tools, no transpilation.

Core files:
- `index.html` — the public-facing PWA (~3,200 lines, fully self-contained)
- `admin.html` — the parish data editor (password-gated, client-side only)
- `parish_data.json` — source of truth (93 parishes, ~1,407 services)
- `events.json` — Young & Catholic and community events (~203 events)
- `sw.js` — service worker for offline support
- `manifest.json` — PWA manifest

Backend:
- **Supabase** — churches, services, events, and bulletin_items tables
- **Bulletin parser pipeline** — `scripts/bulletin-parser/` (Claude Vision API extraction + human review)

Hosting is on **Vercel** (free tier). CI/CD runs through **GitHub Actions**.

---

## Branches

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production | massfinder.com |
| `dev` | Staging / testing | massfinderdev.vercel.app |

**Always work on `dev`.** Never push directly to `main`. When your changes are ready, open a Pull Request from `dev` into `main`.

---

## Local Development

No build step required. Just open the files:

```bash
# Clone the repo
git clone https://github.com/monsballoon-hue/MassFinder.git
cd MassFinder

# Switch to dev
git checkout dev

# Open in browser
open index.html
```

For the admin editor: open `admin.html` in a browser.

For the bulletin parser: see `scripts/bulletin-parser/README.md` (requires Node.js, Supabase credentials in `.env.local`).

---

## Data Model

All parish data lives in `parish_data.json` and is validated against `parish_data.schema.json` on every commit via GitHub Actions. See `DATA_STANDARDS.md` for the complete, authoritative data conventions.

### Key structures

**Parish object:**
- `id` — format: `parish_XXX`
- `name`, `town`, `state`, `zip`
- `locations[]` — one or more worship sites with lat/lng
- `services[]` — Mass times, confession, adoration, devotions, etc.
- `clergy[]` — lead priest + one deacon (uses `role` field, not `title`)
- `contact` — phone, email, website, social links
- `validation` — status, last_checked, bulletin_date

**Service object:**
- `type` — one of 24 enum values (see DATA_STANDARDS.md for full list)
- `day` — e.g. `sunday`, `monday`, `weekday`, `first_friday`, `holyday` (singular `weekday`, never `weekdays`)
- `time` — 24hr format `HH:MM`
- `language` — default `en`, also `es`, `pl`, `la`, `pt`, `fr`, `vi`
- `languages` — array for bilingual services: `["es", "en"]`
- `seasonal` — object: `{ is_seasonal: true, season: "lent" }`. Default: `year_round`. Seasonal values: `lent`, `advent`, `holy_week`, `easter_season`, `academic_year`, `summer`
- `recurrence` — for nth-week patterns: `{ type: "nth", week: 2 }` or `{ type: "nth", weeks: [1, 3] }`

### Validation

The GitHub Actions workflow validates every commit to `main`:
- JSON schema validation via `ajv-cli`
- Blocks deployment if validation fails
- Check `.github/workflows/validate.yml` for details

---

## Making Changes

### Updating parish data
1. Open `admin.html` in a browser, log in
2. Find the parish, edit its services/contact/etc.
3. Download the updated JSON
4. Commit to `dev`, push, verify the preview deployment
5. Open a PR to `main`

### Updating the app (index.html)
1. Make changes on the `dev` branch
2. Test locally by opening `index.html` in a browser
3. Push to `dev` and check the Vercel preview deployment
4. Open a PR to `main` when satisfied

### Adding events (events.json)
Events follow the conventions in `DATA_STANDARDS.md`. Each event needs:
- `id` — format: `parish_XXX-evt-slug` or `yc-YYYY-MM-DD-shortcode`
- `category` — `yc`, `community`, `social`, `fellowship`, `educational`, `liturgical`, `devotional`, `volunteering`
- `parish_id` — must match an existing parish (or `null` for regional events)
- At least one of: `date`, `dates`, or `day`
- `title`, `time`

---

## File Map

```
massfinder-repo/
  index.html                    # Main PWA
  admin.html                    # Parish data editor
  parish_data.json              # All parish data (source of truth)
  parish_data.schema.json       # JSON Schema for validation
  events.json                   # YC & community events
  sw.js                         # Service worker
  manifest.json                 # PWA manifest
  DATA_STANDARDS.md             # Authoritative data conventions
  CLAUDE.md                     # Project context for AI assistants
  scripts/
    prep-review.js              # Generates daily review queue
    bulletin-parser/            # Bulletin parsing pipeline
      prompt.js                 # Claude Vision extraction prompt
      parse-page.js             # Post-parse sanitization
      store-results.js          # Writes to Supabase
      review-ui.html            # Human review web UI
      review-server.js          # Express API server for review
      config.js                 # API keys & Supabase config
  review/
    validation-findings.md      # Per-parish validation results
    validation-checklist.md     # Checklist for bulletin validation
  .github/
    workflows/validate.yml      # CI: schema validation
  supabase/
    migrations/                 # Database migration files
```

---

## External Services

| Service | What it does | Credentials needed |
|---------|-------------|-------------------|
| Vercel | Hosts the PWA | Vercel account access |
| Supabase | Backend database + API | Credentials in `.env.local` |
| Claude API | Bulletin PDF parsing (Vision) | API key in `scripts/bulletin-parser/config.js` |
| Web3Forms | Contact/correction form submissions | API key in index.html |
| Google Analytics | Usage tracking | GA tag in index.html |
| GitHub Actions | Schema validation on commit | Automatic (public repo) |

---

## Code Style

- This is vanilla HTML/CSS/JS. No frameworks, no build tools, no transpilation.
- CSS is inline in `<style>` tags within the HTML files.
- JS is inline in `<script>` tags.
- Use CSS custom properties (defined at the top of the style block) for colors, spacing, and typography.
- Prefer concise, readable code over abstraction.

---

## Questions

Check the project documentation:
- `DATA_STANDARDS.md` — authoritative data conventions
- `CLAUDE.md` — project architecture and context

Or reach out to the maintainer.
