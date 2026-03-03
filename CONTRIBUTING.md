# Contributing to MassFinder

MassFinder is a free Catholic Mass-finder PWA serving 98 parishes across Western New England (MA, CT, VT, NH). This guide covers everything you need to get started as a contributor.

---

## Project Overview

MassFinder is a **static, vanilla JS progressive web app** with no framework, no backend server, and no database. The entire app is:

- `index.html` — the public-facing PWA (~2,900 lines, fully self-contained)
- `admin.html` — the parish data editor (password-gated, client-side only)
- `parish_data.json` — the single source of truth (98 parishes, 1,465 services)
- `events.json` — Young & Catholic and community events
- `sw.js` — service worker for offline support
- `manifest.json` — PWA manifest

Hosting is on **Vercel** (free tier). CI/CD runs through **GitHub Actions**.

---

## Branches

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production | Live site |
| `dev` | Staging / testing | Preview URL |

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

---

## Data Model

All parish data lives in `parish_data.json` and is validated against `parish_data.schema.json` on every commit via GitHub Actions.

### Key structures

**Parish object:**
- `id` — format: `parish_XXX`
- `name`, `town`, `state`, `zip`
- `locations[]` — one or more worship sites with lat/lng
- `services[]` — Mass times, confession, adoration, devotions, etc.
- `contact` — phone, email, website, social links
- `validation` — status, last_checked, bulletin_date

**Service object:**
- `type` — one of 22 enum values (e.g. `sunday_mass`, `confession`, `adoration`, `stations_of_cross`)
- `day` — e.g. `sunday`, `monday`, `first_friday`, `weekdays`
- `time` — 24hr format `HH:MM`
- `language` — default `en`, also `es`, `pl`, `la`, `pt`, `fr`, `asl`, `vi`
- `seasonal` — boolean; if true, `season` specifies when active

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
Events follow the schema in `events.json`. Each event needs:
- `id` — format: `yc-YYYY-MM-DD-shortcode` or `comm-YYYY-MM-DD-shortcode`
- `category` — `yc` or `community`
- `parish_id` — must match an existing parish
- `date`, `time`, `title`, `type`

---

## File Map

```
massfinder-repo/
  index.html                    # Main PWA
  admin.html                    # Parish data editor
  parish_data.json              # All parish data
  parish_data.schema.json       # JSON Schema for validation
  events.json                   # YC & community events
  sw.js                         # Service worker
  manifest.json                 # PWA manifest
  freshness-report.json         # Auto-generated staleness report
  scripts/
    prep-review.js              # Generates daily review queue
    audit-urls.js               # Validates bulletin URLs
  review/
    queue.json                  # Review priority queue
    change_log.json             # Corrections log
    today-prompt.txt            # Claude prompt for daily review
    url-audit.json              # Bulletin URL audit results
  .github/
    workflows/validate.yml      # CI: schema validation
    scripts/freshness-check.js  # Staleness analyzer
```

---

## External Services

| Service | What it does | Credentials needed |
|---------|-------------|-------------------|
| Vercel | Hosts the PWA | Vercel account access |
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

If something is unclear, check the spec sheets in the repo root:
- `MassFinder PWA Spec Sheet.md` — architecture and maintenance system design
- `MassFinder_Implementation_Spec_Sheet.md` — 14-day implementation plan with detailed specs

Or reach out to the maintainer.
