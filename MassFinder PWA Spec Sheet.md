# Building a lightweight maintenance system for MassFinder PWA

**The entire MassFinder maintenance system can run for ~$12/year using exclusively free-tier tools, with a non-technical maintainer spending under 15 minutes daily to keep 98 parishes current.** The key architectural insight is that Catholic church bulletins are overwhelmingly text-extractable PDFs from a handful of major publishers, making automated parsing highly feasible. Combined with a smart prioritization algorithm tied to the liturgical calendar, a simple JSON-file-as-database approach deployed via GitHub Actions to Vercel, and Claude AI for semi-automated parsing, this system achieves professional-grade data freshness without professional-grade costs or complexity.

---

## The daily church review pipeline runs on three cheap layers

The review pipeline follows a straightforward three-step architecture: **scrape → parse → present for human review**. Each layer uses free or near-free tools.

**Layer 1 — Scraping church websites.** Most Catholic parish websites are simple, static HTML pages built on WordPress, eCatholic, or Clover Sites. **Cheerio + axios** (both free Node.js libraries) handle ~90% of these sites at zero cost. For the minority of JavaScript-rendered sites, Puppeteer serves as a fallback. Cloud scraping is unnecessary at this scale — scraping 2–5 churches per day means only 60–150 page requests per month. Church websites have virtually no anti-bot protection, so the only rate-limiting concern is politeness (2–5 second delays between requests). For parishes that lack websites, the system falls back to bulletin PDFs or manual verification.

**Layer 2 — PDF bulletin parsing.** This is where the system gets clever. Catholic bulletins come from a small number of major publishers — **LPi (Liturgical Publications), Diocesan.com, and JPPC** — all of which produce digitally-typeset, text-extractable PDFs. An estimated **85–95% of digitally-distributed bulletins are natively text-extractable**, not scanned images. The npm package `pdf-parse` handles text extraction, and Mass schedules appear on page 1 in a consistent sidebar or header block across all major publishers. LPi bulletins follow predictable URL patterns at `container.parishesonline.com/bulletins/{ID}/{date}B.pdf`, enabling automated download. For the rare scanned bulletin, Google Cloud Vision API provides **1,000 free OCR units per month** — more than sufficient as a fallback.

**Layer 3 — AI-powered structured extraction.** Raw bulletin text is unstructured — Mass times mixed with announcements, ads, and parish news. An LLM converts this into structured JSON. **GPT-4o-mini at $0.15 per million input tokens** processes a typical 4-page bulletin for under $0.002. Processing all 98 parishes costs under $0.50. Claude Haiku runs slightly higher at ~$1–3 per full cycle. The LLM receives a system prompt defining the exact JSON schema and returns structured Mass schedule data. The human validation step catches any hallucinated times before they reach production.

**The review interface** presents a side-by-side comparison: current stored data on the left, freshly scraped data on the right, with differences highlighted in color. One-click actions let the maintainer approve unchanged data, accept scraped changes, manually edit, or flag for later. The entire daily session of 2–5 parishes should take **5–15 minutes**.

---

## GitHub Actions and Vercel provide a zero-cost deployment pipeline

The deployment pipeline triggers automatically when `parish_data.json` is updated, validates the data against a JSON schema, and deploys to Vercel — all within free tiers.

**GitHub Actions** provides **unlimited free minutes for public repositories**. Even for private repos, the free tier includes 2,000 minutes per month — a simple deploy workflow using ~2–3 minutes per run would consume only 60–90 minutes monthly. The workflow uses path filtering to trigger only on relevant file changes:

```yaml
on:
  push:
    branches: [main]
    paths: ['parish_data.json', 'src/**']
```

**JSON validation runs before deployment** using the `GrantBirki/json-yaml-validate` or `dsanders11/json-schema-validate-action` GitHub Actions. A custom JSON Schema enforces required fields (parish name, address, at least one Mass time), validates time formats with regex patterns, checks for duplicate IDs, and ensures enum values match allowed options (service types, seasonal flags, days of the week). If validation fails, deployment is automatically blocked.

**Vercel's Hobby plan** provides **100 GB of bandwidth per month** — enough for 100,000+ visitors to a static PWA. Deployments are unlimited (rate-limited to 100/hour). Deployment uses the Vercel CLI from within GitHub Actions: `vercel pull`, `vercel build --prod`, `vercel deploy --prebuilt --prod`. The `--prebuilt` flag means the build happens in GitHub Actions and only artifacts are uploaded to Vercel. One important caveat: Vercel's Hobby plan is **technically for personal, non-commercial use only**. A free community project should be fine, but if MassFinder generates revenue (including donations), reviewing the Terms of Service is wise.

**Rollback is instant.** Vercel's dashboard allows promoting any previous deployment to production in seconds. Git-level rollback via `git revert` triggers a new clean deployment automatically. The workflow can also archive the previous `parish_data.json` as a GitHub artifact before each deploy.

For a non-technical maintainer, the safest editing workflow is through **GitHub's web editor**: navigate to the file, click the pencil icon, make changes, and commit to a new branch. This automatically creates a Pull Request, runs validation, and shows a clear pass/fail before merging.

---

## A schema-driven JSON editor solves the admin form problem

The standout solution for the admin form is the **json-editor/json-editor** open-source library, which auto-generates an HTML form from a JSON Schema — complete with add/remove buttons for nested arrays, dropdown enums, and built-in validation. This is purpose-built for exactly this use case.

The maintainer defines the parish data schema once (church name, address, website, plus an array of service objects each containing service_type, start_time, end_time, seasonal enum, language, and notes). The library generates a fully functional form with dynamic "Add Service" / "Remove Service" buttons, dropdown selects for enums, and a "Copy JSON to Clipboard" button added with one line of code: `navigator.clipboard.writeText(JSON.stringify(editor.getValue(), null, 2))`. The entire admin page is a **single HTML file plus a CDN link** — hostable on Vercel or GitHub Pages for free, requiring perhaps 50 lines of HTML/JavaScript to configure.

The alternatives all fall short for this specific use case. **Google Forms** cannot handle variable-length nested arrays (one church might have 2 services, another might have 8). **Tally.so** lacks a native "repeating group" field type and doesn't output clipboard-ready JSON. **Airtable** models data relationally (separate tables for churches and services), which maps poorly to a single nested JSON object without a custom export script. **Netlify Forms** is a form backend, not a form builder. A custom React app works but is overkill — more build tooling, more maintenance surface area, more complexity for a non-technical maintainer.

For the **event submission portal** (where external organizers submit event data for maintainer approval), **FormSubmit.co** offers the best free tier: unlimited submissions, file uploads up to 10MB (for event flyers), reCAPTCHA spam protection, and custom redirect — all completely free. Since Web3Forms is already in use (250 submissions/month free), keeping it for the primary contact form and adding FormSubmit for event submissions creates a clean separation. Tally.so is a strong alternative with beautiful form UX if the maintainer prefers a visual form builder over custom HTML.

---

## Claude AI fits best as a semi-automated parsing assistant

The most practical Claude integration for a non-technical maintainer is **Claude Pro at $20/month**, using Projects as a persistent parsing workspace — though cheaper alternatives exist for budget-conscious operators.

**Claude Projects** allow uploading the parish dataset, a parsing instructions document, a JSON schema definition, and a corrections log as persistent Project Knowledge files. Custom Instructions define exactly how Claude should parse Mass schedules. The workflow is simple: the maintainer opens the project, pastes scraped website text or uploads a PDF bulletin, and Claude returns structured JSON following the predefined schema. Claude has **native PDF support** — it converts each page into an image and extracts text simultaneously, handling both text-based and scanned bulletins. A typical 4-page bulletin costs **12,000–18,000 input tokens**, or roughly $0.02–0.06 per bulletin depending on the model.

**The learning loop works through accumulated Project Knowledge**, not fine-tuning (which Anthropic does not offer). The maintainer maintains a corrections log documenting parsing patterns and parish-specific quirks: "When a parish lists 'Vigil Mass' without a day, it always means Saturday." "Spanish masses are listed as 'Misa en Español' — extract language as 'Spanish.'" Claude references this growing document via RAG (retrieval-augmented generation) in every subsequent parsing session, effectively improving over time without any model training.

For **pure cost optimization**, the API route with GPT-4o-mini is dramatically cheaper: **$0.15 per million input tokens** versus Claude Haiku's $1.00. Processing all 98 parishes via GPT-4o-mini costs under $0.50 per cycle. Google Gemini Flash offers a limited free tier (100–1,000 requests/day). A fully automated pipeline using GitHub Actions → scraping script → LLM API → diff generation would cost **$1–5/month** in API fees and require zero daily interaction beyond reviewing the generated diffs.

The recommended path is to **start with Claude Pro** ($20/month) for the paste-and-parse workflow, which requires zero technical setup. Over time, recruit a developer volunteer to build the automated GitHub Actions pipeline using the cheaper API route. Claude's **MCP (Model Context Protocol)** with a Firecrawl MCP server could eventually allow the maintainer to say "Scrape the Mass schedule from stmarys.org" directly in Claude Desktop, but this requires local setup that adds complexity for a non-technical user.

---

## Ko-fi is the optimal donation platform at 0% platform fees

**Ko-fi charges zero platform fees on one-time donations** — only the underlying Stripe or PayPal processing fees apply (~2.9% + $0.30). On a $5 donation, the project receives ~$4.55. This beats Buy Me a Coffee (5% platform fee + processing = ~$4.30 net on $5) and every other platform evaluated. Ko-fi supports both Stripe and PayPal (giving donors more payment options), offers embeddable buttons, requires no account from donors, and provides instant payouts.

The donation prompt should appear **after a user confirms service times are correct** — a natural feel-good moment of community contribution. Sample copy: *"Thanks for helping keep Mass times accurate! MassFinder is a free community project. If it's been helpful, consider supporting it. 🙏"* Best practices include showing the prompt infrequently (once per session or once per week, never on first visit), keeping it dismissible, and offering pre-set amounts of **$2, $5, and $10** (research shows donors tend to pick the middle option). A handful of $5 donations per month covers the project's only hard cost: the ~$12/year domain name.

---

## The complete free-tier ecosystem costs $12 per year

Every service in the MassFinder stack operates within generous free tiers. The only recurring cost is a custom domain:

| Service | Purpose | Free tier limit | Annual cost |
|---------|---------|----------------|-------------|
| GitHub (public repo) | Code hosting, Actions CI/CD | Unlimited minutes, 500MB storage | $0 |
| Vercel Hobby | PWA hosting | 100GB bandwidth, unlimited deploys | $0 |
| Web3Forms | Contact/correction forms | 250 submissions/month | $0 |
| FormSubmit.co | Event submissions | Unlimited submissions + file uploads | $0 |
| Cloudflare | DNS, CDN, SSL | Unlimited bandwidth | $0 |
| Resend | Email notifications | 3,000 emails/month | $0 |
| json-editor | Admin form library | Open source (MIT) | $0 |
| pdf-parse | PDF text extraction | Open source | $0 |
| Cheerio + axios | Web scraping | Open source | $0 |
| Umami (self-hosted) | Privacy-friendly analytics | Unlimited on Vercel + Supabase | $0 |
| Ko-fi | Donation platform | 0% platform fee | $0 |
| Custom .com domain | Branding | — | ~$12 |
| **Total** | | | **~$12/year** |

**Critical gotcha**: SendGrid retired its free tier in July 2025. Use **Resend** (3,000 emails/month free) or Mailgun (100/day free) for email notifications. Also note that Vercel's Hobby plan imposes a **hard wall** when limits are exceeded — the site goes down rather than accruing overage charges. For a static PWA serving 98 parishes, hitting 100GB bandwidth would require extraordinary traffic and is unlikely.

No credit card is required for any of these free tiers.

---

## Edge cases demand defensive design and graceful degradation

The system faces several categories of failure, each requiring a specific mitigation strategy.

**Parishes without functional websites** represent the largest challenge. A 2025 audit found **64% of churches either had no website or had a seriously deficient one**. Catholic parishes are somewhat better resourced than average, but a meaningful percentage rely solely on Facebook pages, diocesan directory listings, or print-only bulletins. For these parishes, the system must fall back to manual verification via phone calls to the parish office, user-reported corrections, or diocesan directory data. The data model should include a `source_type` field (website, bulletin, phone, user_report) and a `verification_confidence` score.

**Seasonal schedule changes** occur **6–10 times per year** per parish. The most complex are Holy Week (a completely unique 4-day schedule), Christmas (3–5 extra Masses), and summer reductions (dropping one or more weekend Masses). The JSON data model should use a **layered schedule approach**: a `baseSchedule` for regular times, `seasonalOverrides` with date ranges, and `specialDates` for one-off events. Parishes typically publish seasonal schedules only **1–3 weeks in advance**, creating a narrow window for data capture.

**The single-maintainer risk** is existential. Open source research shows **60% of solo maintainers have quit or considered quitting**, with 44% citing burnout. Mitigations include aggressive automation, batching work into focused sessions, documenting all procedures in a CONTRIBUTING.md, storing credentials in a shared password manager with emergency access, and designing the system for **graceful degradation** — if maintenance stops entirely, the static site continues serving existing data indefinitely. The "last verified" date displayed on each listing sets honest expectations with users.

**Technical service outages** are manageable. Vercel has experienced **1,062+ incidents** over ~7 years, but static CDN content continues serving during control plane outages. GitHub Actions had **25 incidents in 2024**. Designing automated workflows to be idempotent and retriable, with manual `workflow_dispatch` as fallback, prevents any single outage from causing data loss.

---

## Smart prioritization keeps 98 parishes fresh with 15 minutes daily

At **3 parishes per day** (the recommended baseline), the full dataset cycles every 33 working days — roughly 7 complete cycles per year, aligning naturally with major liturgical season transitions. The prioritization algorithm weights four factors:

- **Seasonal urgency (35% weight)**: Proximity to the next liturgical schedule change. Scores 1.0 when a season transition is within 2 weeks, 0.7 within 4 weeks, 0.3 for an upcoming Holy Day of Obligation
- **Time since last review (30%)**: Linear scaling against a maximum acceptable age (90 days during ordinary time, 30 days during transitions)
- **User-reported issues (20%)**: Any unresolved correction report jumps the parish to the top of the queue
- **Historical change frequency (15%)**: Parishes that change schedules more often (multi-site parishes, those with summer reductions) get reviewed more frequently

**Pre-season surges** are critical. The maintainer should temporarily increase to **5/day in the 3 weeks before Christmas, Easter, and summer schedule changes**. A static list of trigger dates (which are predictable years in advance) or the open-source LiturgicalCalendarAPI can drive automated priority alerts. For 2026, the critical dates are: Ash Wednesday (Feb 18), Holy Week (Mar 29–Apr 5), summer schedule (~June 1–15), Advent (Nov 29), and Christmas (Dec 24–25).

Comparable services validate this approach. **CatholicMassTimes.com** processes 5,000–7,000 updates per month across 114,000+ churches using a combination of algorithmic stale-data detection and crowdsourced updates. **MassTimes.org** (121,000 churches, 201 countries) relies entirely on crowdsourcing and volunteer verification. Both display "last updated" dates per parish — MassFinder should do the same to build trust and set honest expectations.

---

## Conclusion: practical implementation roadmap

The MassFinder maintenance system achieves professional data quality through thoughtful automation layered on top of free-tier infrastructure. Three insights make this work that aren't obvious from the outside.

First, **Catholic bulletin publishing is surprisingly consolidated** — LPi and Diocesan serve thousands of parishes with digitally-typeset, text-extractable PDFs following consistent formatting patterns. This transforms what seems like an intractable parsing problem into a structured extraction task that cheap LLMs handle for pennies.

Second, **the liturgical calendar is the maintenance calendar**. Rather than treating all 98 parishes as equally likely to change, tying review prioritization to the predictable rhythm of Advent, Lent, Holy Week, and summer schedules concentrates effort where data actually goes stale.

Third, **the json-editor/json-editor library** eliminates the apparent tension between "structured nested data" and "non-technical maintainer." A single JSON Schema generates a complete, validated admin form that outputs clipboard-ready JSON — no backend, no database, no server-side code.

The implementation order should be: (1) JSON schema + admin form using json-editor, (2) GitHub Actions validation + Vercel auto-deploy pipeline, (3) simple scraping scripts for the most common parish website patterns, (4) Claude Pro project for semi-automated bulletin parsing, (5) Ko-fi donation integration, and (6) event submission portal via FormSubmit. Each layer is independently useful, and the system works even if later layers are never built — the maintainer can always fall back to manual data entry through the admin form.