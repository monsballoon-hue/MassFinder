# MassFinder — Feature Discovery Report
## Open Source Catholic Ecosystem & New Feature Opportunities

**Date:** March 7, 2026
**For:** Mike (MassFinder maintainer)
**Purpose:** Catalog open source repos and APIs that can power new features, evaluated against Apple design principles and real user need.

---

## EVALUATION FRAMEWORK

Every feature below is evaluated on three axes, all required:

**NEED** — Does this solve a real problem for a 50+ Catholic parishioner in Western New England? Would they miss it if it disappeared? Would they tell a friend about it?

**BEAUTY** — Does it follow Apple's progressive disclosure? Is there delight in using it? Does it earn its screen space through visual elegance and clarity?

**FEASIBILITY** — Can it be built with vanilla HTML/CSS/JS in a single-file PWA with no build tools? What repos/APIs make it possible? What's the effort?

Features that fail any one axis are noted as such and deprioritized.

---

## TIER 1: HIGH IMPACT, CLEAR NEED, BUILDABLE NOW

These features solve problems your users have today, can be powered by proven open source repos, and would make MassFinder feel like it belongs on someone's home screen.

---

### 1.1 — Interactive Examination of Conscience

**The need:** Your "How to go to Confession" devotional guide (line 2598 of `index.html`) is static text. It tells users *about* confession but doesn't help them *prepare* for it. ConfessIt (confessit.app) has 50K+ downloads and glowing reviews because it solves this exact problem — the anxiety of walking into the confessional without having thought through what to say. MassFinder already knows where every confession time is. The natural next step is helping users prepare before they drive there.

**What it looks like (Apple-style):** A clean, commandment-by-commandment progressive disclosure. Each commandment is a card that expands to show 4-6 plain-language reflection questions. User taps questions that resonate — a subtle navy dot appears. At the end, a summary card shows their selected items with the Act of Contrition and the step-by-step confession walkthrough. No data leaves the device. No accounts. Nothing stored between sessions. One-task-per-view.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **kas-catholic/confessit-web** | Examination of conscience content organized by Ten Commandments + Precepts of the Church. Translated into multiple languages (useful for Polish/Spanish parishioners). Content is based on CCC with Bible citations. MIT-licensed Astro/React app — extract the JSON data files, not the framework. |
| **aseemsavio/catholicism-in-json** | CCC paragraphs in JSON format. Use to provide inline CCC citations (e.g., "CCC 2042" → actual text) within the examination questions. Public domain content. |
| **github.com/confessionapp.org** | Alternative examination structure — Ten Commandments with tap-to-count approach. Simpler than ConfessIt. |

**Integration with MassFinder:** After the user completes the examination, a "Find Confession Near You" button at the bottom filters the main list to `confession` services sorted by proximity. The flow is: examine → prepare → go. One journey.

**Deep link opportunity:** The existing "How to go to Confession" devotional guide gets a new CTA: "Prepare now →" that scrolls to/opens the examination tool.

**Build effort:** Medium. ~200 lines of JS + HTML. Content extraction from ConfessIt's i18n JSON is the main work. No external API calls needed — all content ships with the app.

---

### 1.2 — Liturgical Color & Season Awareness (Ambient UI)

**The need:** Catholics live inside a liturgical calendar that most apps ignore. When your user opens MassFinder during Lent, the app should *feel* like Lent — not through garish theming, but through subtle, tasteful signals that say "this app understands my faith life." No Catholic app in the Mass-finding space does this well.

**What it looks like:** The app's accent color (currently static navy/gold) subtly shifts to match the current liturgical season. During Lent: deep purple accents. Advent: royal purple. Easter: white/gold. Ordinary Time: green. Christmas: white/gold. The saint card border, the "Today" tab header accent, and the reading section headings all respond. Not a full theme — just the accent touches. Like how Apple's Weather app shifts color palette by time of day.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **LitCal API v5** (already specced) | `liturgical_season` field: `LENT`, `ADVENT`, `CHRISTMAS`, `EASTER`, `EASTER_TRIDUUM`, `ORDINARY_TIME`. Authoritative. One fetch per day. |
| **romcal/romcal** | JavaScript library (npm) that generates the liturgical calendar client-side — no API call needed. Includes liturgical colors per day, season computation, US national calendar. Could run entirely in-browser as a fallback if LitCal API is down. v3 beta is TypeScript but the v1.3 stable is CommonJS-compatible. |

**CSS implementation sketch:**
```css
:root[data-season="lent"]     { --color-accent: #6B21A8; --color-accent-text: #7C3AED; }
:root[data-season="advent"]   { --color-accent: #6B21A8; --color-accent-text: #7C3AED; }
:root[data-season="easter"]   { --color-accent: #D97706; --color-accent-text: #B45309; }
:root[data-season="christmas"]{ --color-accent: #D97706; --color-accent-text: #B45309; }
:root[data-season="ordinary"] { --color-accent: #16A34A; --color-accent-text: #15803D; }
```

One line of JS at app load: `document.documentElement.setAttribute('data-season', litcalSeason.toLowerCase());`

**Build effort:** Small. ~30 lines of JS, ~20 lines of CSS. Depends on LitCal integration (Phase 1 of the API spec).

---

### 1.3 — Inline Catechism References

**The need:** Your devotional guides are full of CCC citations — "CCC 2180", "CCC 1457", "CCC 1166-1167" — but they're just bold text. Users can't tap to see the actual paragraph. The CCC is the single most important reference document in modern Catholicism, and it's now available in structured JSON.

**What it looks like:** CCC references in the devotional guides become tappable. Tap "CCC 2180" and a slim bottom sheet slides up with the full paragraph text, beautifully typeset. Swipe down to dismiss. Like tapping a footnote in Apple Books.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **nossbigg/catechism-ccc-json** | All 2,865 paragraphs of the CCC in JSON format. Each entry: `{ id: 2180, text: "..." }`. ~2MB. Ship as a static JSON file alongside `parish_data.json`, or lazy-load on first tap. |
| **aseemsavio/catholicism-in-json** | Same content plus Canon Law and GIRM. Markdown-formatted text with bold/italics. Released via GitHub Releases. |
| **nossbigg/catechism** | A modernized web reader of the CCC built in React — examine for UX patterns but don't use the framework. |

**Data size concern:** The full CCC JSON is ~2MB. Options: ship it as `catechism.json` alongside `parish_data.json` (cached by service worker), or host it on your Vercel project and lazy-fetch paragraphs on tap. Since taps will be infrequent, lazy-fetch is fine.

**Build effort:** Small-Medium. ~80 lines of JS (fetch paragraph, render bottom sheet, dismiss gesture). Biggest work is the bottom-sheet CSS animation to feel native.

---

### 1.4 — Guided Rosary Companion

**The need:** The Rosary is the most common Catholic devotion. Your app already tracks rosary service times at parishes. But when a user sees "Rosary — Sunday 6:30 PM" and thinks "I should pray the rosary more," there's nowhere in MassFinder to actually *do* that. This is the gap between information and formation.

**What it looks like:** A single-view guided rosary in the Devotions section. Not a full app — not animated beads or audio. Instead, a clean, scrollable flow: today's mysteries (auto-selected by day of week, or by liturgical season using LitCal data), with each decade showing the mystery title, a one-line Scripture meditation, and the prayer texts. A subtle progress indicator shows which decade you're on. Tap "Next Decade" to advance. The whole thing fits on one screen per decade, large text, high contrast, readable by a 70-year-old without reading glasses.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **marchiartur/pray-the-rosary** | PWA rosary with mystery-by-day auto-selection. Open source. Examine for mystery/prayer content structure. |
| **Krixec/Rosarium** | Multilingual rosary app (Codeberg). Has mystery texts in multiple languages including Polish. |
| **leozamboni/Rosarium** | Interactive rosary with 3D church models — over-engineered for MassFinder, but the mystery text content and Scripture meditations are reusable. |
| **BibleGet API** (already specced) | Fetch the actual Scripture verse for each mystery meditation (e.g., Luke 1:28 for the Annunciation) in NABRE with verse formatting. |

**Liturgical integration:** During Lent, auto-select Sorrowful Mysteries on days that aren't otherwise assigned. LitCal's `liturgical_season` drives this.

**Rosary mystery data structure (ship as inline JS):**
```javascript
var ROSARY_MYSTERIES = {
  joyful: { day: [1,6], title: 'The Joyful Mysteries', decades: [
    { title: 'The Annunciation', ref: 'Lk1:26-38', meditation: 'Mary receives the angel Gabriel...' },
    // ... 5 total
  ]},
  sorrowful: { day: [2,5], title: 'The Sorrowful Mysteries', decades: [...] },
  glorious:  { day: [3,0], title: 'The Glorious Mysteries', decades: [...] },
  luminous:  { day: [4],   title: 'The Luminous Mysteries', decades: [...] }
};
```

**Build effort:** Medium. ~150 lines of JS, ~60 lines of CSS. Content curation (mystery meditations, Scripture refs) is the main work. The UI is simple progressive disclosure.

---

## TIER 2: STRONG POTENTIAL, REQUIRES CONTENT CURATION

These features serve real needs but require assembling content from multiple sources before code can be written.

---

### 2.1 — Daily Saint Biography Card

**The need:** Your saint card (currently broken) shows a name and links. But what people actually want is to *learn something* about the saint. "Oh, it's the feast of St. Perpetua and Felicity? Who were they?" A 2-3 sentence biography with their feast date, patronage, and a quote transforms the saint card from a label into a moment of formation.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **LitCal API** | Saint name, feast grade, liturgical color, and reading references per day. 555 events/year for US calendar. The *name* data is authoritative. |
| **cpbjr/catholic-readings-api** | Aims to provide saint biographies with quotes per date. GitHub Pages hosted. Currently spotty coverage — monitor for maturity. |
| **masaharumori7/doctors-of-the-church** | Gallery list of all 37 Doctors of the Church with descriptions and notable works. Useful for Doctor feast days. |
| **GomezMig03/MotivationalAPI** | Catholic motivational phrases — could source saint quotes. |
| **Wikipedia API** | For saints not covered by Catholic-specific repos, a simple Wikipedia summary API call (`en.wikipedia.org/api/rest_v1/page/summary/{Saint_Name}`) returns a 2-sentence extract. Free, no auth. |

**The content curation problem:** There is no single free API that provides a 2-sentence biography for every saint on the calendar. You'd need to build a `saints.json` data file covering at least the 62 obligatory Memorials + 13 Feasts + 21 Solemnities = 96 saints/feasts. The Doctors of the Church repo covers 37 of these. Wikipedia covers the rest. This is a curation project — assembling and editing ~100 short biographies.

**Build effort:** Small (code), Large (content). ~50 lines of JS to render. ~20 hours to curate 100 saint bios.

---

### 2.2 — Stations of the Cross Interactive Guide

**The need:** You already have a Stations of the Cross devotional guide (line 2705) and track Stations service times at parishes. During Lent, Stations is the most attended devotion after Mass. An interactive station-by-station guide — designed for someone sitting in a pew with their phone — would be genuinely useful.

**What it looks like:** 14 stations, each a full-screen card. Station name + number at top, a one-paragraph meditation, the response prayers, and a "Next Station →" button. Large text. No scrolling within a station — everything visible at once. A thin progress bar at top shows station 7/14. Swipe or tap to advance.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **BibleGet API** | Fetch the Scripture verse associated with each station in NABRE. |
| **nossbigg/catechism-ccc-json** | CCC references for theological context on each station. |

**Content:** The traditional 14 stations with meditations are widely published and public domain (many versions from saints like St. Alphonsus Liguori). The Scripture references are standard. This is primarily a formatting/design exercise.

**Seasonal gating:** Only prominently surfaced during Lent (using LitCal `liturgical_season === "LENT"`). Available year-round in the devotions section but featured on the home screen during Lent.

**Build effort:** Medium. ~120 lines of JS, ~40 lines of CSS. Content is readily available.

---

### 2.3 — Daily Scripture Verse Widget

**The need:** Beyond the full daily readings (which are long and require engagement), a single daily verse — one sentence of Scripture — is the kind of thing that makes someone glad they opened the app. It's the "thought for the day" that Catholic radio stations do, but in your pocket.

**What it looks like:** A small card below the saint card in the Today tab. One verse, beautifully typeset with the reference. Different verse daily. Optionally matched to the liturgical season or the day's readings.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **BibleGet API** | Fetch any verse by reference in NABRE with formatting. |
| **LitCal API** | The `gospel_acclamation` field on each day's event contains the verse reference proclaimed before the Gospel — these are short, punchy, seasonally appropriate verses. Perfect for a daily verse widget. |
| **rat9615/random-bible-verses** | Random Bible verse display — examine for UX pattern but build your own with BibleGet for NABRE compliance. |

**The elegant approach:** Use LitCal's `gospel_acclamation` reference for the day → fetch from BibleGet → render. This gives you a liturgically appropriate verse every day without maintaining a separate curated list. The acclamation verses are specifically chosen by the Church to be short and impactful.

**Build effort:** Small. ~40 lines of JS, ~15 lines of CSS. Depends on LitCal + BibleGet integrations.

---

## TIER 3: DIFFERENTIATING FEATURES FOR DELIGHT

These don't solve urgent problems but create moments of delight that make users love the app and tell others about it.

---

### 3.1 — Liturgical Calendar Subscription (ICS)

**The need:** Your 50+ demographic uses phone calendars. They'd love to see "Feast of St. Joseph" on March 19 in their calendar app alongside their doctor's appointment and their grandchild's soccer game. It makes faith visible in daily life.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **LitCal API** | ICS output endpoint. One URL, subscribe once, auto-updates yearly. |

**What it looks like:** A card in the More tab: "Add the Liturgical Calendar to your phone." One tap. Uses the same three-tier iCal approach as your YC events export (Web Share API → data URI → blob fallback). The subscription URL auto-populates with solemnities, feasts, and Holy Days of Obligation.

**Build effort:** Tiny. ~20 lines of JS. One card in More tab HTML.

**Note:** The ICS endpoint needs verification — in testing it returned JSON even with `returntype=ICS`. May need `Accept: text/calendar` header.

---

### 3.2 — Latin/English Toggle on Readings

**The need:** Western New England has a significant Catholic population that appreciates tradition. The ability to read the day's Gospel in the Vulgate Latin alongside the NABRE English — or to see the Douay-Rheims traditional English — is the kind of feature that makes a devotionally serious Catholic say "this app was made for me."

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **BibleGet API** | NABRE (standard), DRB (traditional English), NVBSE (Nova Vulgata Latin), VGCL (Clementina Vulgata Latin). All from the same endpoint, just change the `version` parameter. |
| **borderstech/vulgata** | Douay-Rheims English + Clementina Vulgata Latin side-by-side as static data. Could serve as offline fallback. |

**What it looks like:** A small segmented control below the reading heading: `NABRE | DRB | Latin`. Default is NABRE. Tap DRB for Douay-Rheims. Tap Latin for Nova Vulgata. The reading re-renders with the new translation. No page reload — just swap the verse content.

**Build effort:** Small (given BibleGet is already integrated). ~30 lines of JS for the toggle + re-fetch.

---

### 3.3 — Holy Day of Obligation Alerts

**The need:** Missing a Holy Day of Obligation is a serious matter for practicing Catholics. Your users already use MassFinder to find Mass. If MassFinder could surface "Tomorrow is the Feast of the Assumption — a Holy Day of Obligation" the evening before, it would prevent the most common oversight in Catholic practice.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **LitCal API** | `holy_day_of_obligation: true` field on US-specific events. The 2026 US calendar has 6 HDOs: Mary Mother of God (Jan 1), Ascension (May 17), Assumption (Aug 15), All Saints (Nov 1), Immaculate Conception (Dec 8), Christmas (Dec 25). |

**What it looks like:** On the evening before an HDO, a subtle card appears at the top of the Today tab: "Tomorrow is a Holy Day of Obligation" with the feast name and a link to filter Mass times. Not a notification (too invasive for a PWA without push notification permission). Just an in-app banner on the relevant day.

**Build effort:** Small. ~30 lines of JS. Check LitCal events for tomorrow, filter for `holy_day_of_obligation === true`, render banner.

---

### 3.4 — Novena Tracker

**The need:** Your Novena devotional guide (line 2690) explains what novenas are. But praying a novena means committing to 9 consecutive days. People lose track. "Was today day 6 or day 7?" A simple day tracker — which novena, which day, when you started — would be genuinely useful.

**What it looks like:** In the Devotions section, a "Start a Novena" card. Select from common novenas (Divine Mercy, St. Joseph, Holy Spirit, Miraculous Medal). The app marks today as Day 1 and shows a simple 9-dot progress indicator. Each day, the relevant prayer text is displayed. On Day 9, a completion message. Data stored in-memory only (no localStorage per PWA artifact constraints — but since this is the deployed app, localStorage is fine here).

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **mftruso/st-andrew-novena** | Flutter app for St. Andrew Novena — examine for prayer text and day-tracking UX. |
| **ElderFausto/caminho-api** | 999 points from "The Way" by St. Josemaría Escrivá — not a novena per se, but the API pattern of daily sequential spiritual content is the same. |

**Content:** Novena prayer texts are widely available and public domain. The Divine Mercy Novena texts are from St. Faustina's diary. The St. Joseph novena, Holy Spirit novena (traditionally prayed between Ascension and Pentecost), and Miraculous Medal novena texts are all standard.

**LitCal integration:** When the LitCal API shows it's the period between Ascension and Pentecost, auto-suggest the Novena to the Holy Spirit. When it's Good Friday, suggest the Divine Mercy Novena (which begins that day and ends on Divine Mercy Sunday).

**Build effort:** Medium. ~100 lines of JS, ~40 lines of CSS. Content curation for 4-5 novena prayer sets.

---

## TIER 4: LONG-TERM VISION / REQUIRES SIGNIFICANT CURATION

---

### 4.1 — Church Fathers Daily Reading

**The need:** For the devotionally serious user, a daily excerpt from the Church Fathers (Augustine, Aquinas, Chrysostom, etc.) matched to the liturgical season or the day's readings would make MassFinder a daily spiritual companion, not just a schedule lookup tool.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **Jacob-Gray/summa.json** | Summa Theologica in structured JSON. 7 parts, questions, articles. Public domain (Benziger Bros. 1947). |
| **Geremia/AquinasOperaOmnia** | Complete works of St. Thomas Aquinas, bilingual Latin-English. |
| **borderstech/romanus** | Roman Catechism of the Council of Trent in structured format. |
| **LitCal API** | Season and feast data to drive thematic matching. |

**The curation challenge:** Selecting 365 short excerpts, matching them to liturgical seasons, and editing them for readability is a 40-60 hour content project. The JSON repos provide the raw material. The editorial work is the bottleneck.

**Build effort:** Small (code) after content exists. ~50 lines of JS. But 40+ hours of content work.

---

### 4.2 — Parish Directory with Clergy

**The need:** "Who's the pastor at St. Mary's?" Your `parish_data.json` has parish names, locations, and services — but no clergy. The LitCal API's bulletin parser extracts clergy names (pastor + first deacon) from page 1 of bulletins. Over time, this builds a clergy directory.

**Open source to leverage:**

| Repo | What it gives you |
|------|-------------------|
| **ChrisVo/cardinals** | List of all Roman Catholic Cardinals in JSON. Interesting but not directly useful for parish-level clergy. |
| **catholic-hierarchy.org** | Current and historical diocese/bishop data. Not an API, but a reference for diocese-level data. |
| **Your own bulletin parser V2** | Already extracts `clergy: [{role, name}]` from bulletins. This data can flow into `parish_data.json` as a new field. |

**Build effort:** Medium. Schema change to `parish_data.json`, new render logic in parish detail panels. The data pipeline (bulletin parser → clergy field) already exists in prototype.

---

## REPOS EVALUATED AND DEPRIORITIZED

These were reviewed but don't meet the three-axis test for MassFinder right now:

| Repo | Why not |
|------|---------|
| **gregorio-project/gregorio** | Gregorian chant engraving software. Beautiful but irrelevant to a Mass-finder PWA. |
| **missal.io / missalemeum** | TLM missals. MassFinder serves the Ordinary Form primarily. |
| **divinum-officium** | Traditional Divine Office. Too niche for a 50+ general audience. |
| **leozamboni/Domus** | 3D church models via photogrammetry. Beautiful but requires WebGL and heavy assets — wrong for a lightweight PWA. |
| **sanctum-ipsum** | Holy lorem ipsum generator. Fun but not useful. |
| **lectionarium** | Ecclesiastical Latin study tool. Command-line. Wrong audience. |
| **geomesse-api** | French Mass-time API. Wrong geography. |
| **us_diocese_mapper** | Interactive diocese maps. Interesting but solves a different problem than parish-level Mass finding. |

---

## OPEN SOURCE COMMUNITY CONTACTS

The Catholic open source community is small and collaborative. Key people:

| Person | Role | Connection to MassFinder |
|--------|------|--------------------------|
| **Fr. John Romano D'Orazio** | Priest, Diocese of Rome. Author of BibleGet + LitCal API. | MassFinder is a natural consumer of both his APIs. Reaching out with a "here's how we're using your work" email could open collaboration. |
| **Mike Kasberg** | Senior SWE at Strava. Author of ConfessIt. Contributor to LitCal API JSON structuring. | Founder of the Open Source Catholic Slack. Gateway to the community. ConfessIt's examination content could be adapted for MassFinder. |
| **Mike Truso** | Co-Founder of JobPost. Founder of St. Isidore Guild for Catholic IT Professionals. Contributed LitCal frontend. | The St. Isidore Guild is a network of Catholic tech professionals. MassFinder's open-source fork story could be presented there. |

**Community hub:** Open Source Catholic Slack — referenced in ConfessIt's CONTRIBUTING.md. This is where Catholic developers collaborate.

---

## RECOMMENDED BUILD ORDER

Taking into account what's already specced (API Integration doc), what's broken (saint card), and what creates the most user delight per line of code:

| Priority | Feature | Dependencies | Effort | Impact |
|----------|---------|-------------|--------|--------|
| **1** | Fix Saint Card (LitCal API) | Already specced | 2 hours | Fixes broken feature |
| **2** | Liturgical Season Ambient UI | LitCal integration | 1 hour | Subtle delight, brand differentiation |
| **3** | Bible-Formatted Readings (BibleGet) | Already specced | 4 hours | Biggest single UX upgrade |
| **4** | HDO Eve Alerts | LitCal integration | 1 hour | Prevents real-world spiritual harm |
| **5** | Daily Verse Widget | LitCal + BibleGet | 1 hour | Daily engagement hook |
| **6** | Interactive Examination of Conscience | ConfessIt content extraction | 6 hours | Deepest feature, strongest word-of-mouth |
| **7** | Inline CCC References | catechism-ccc-json | 3 hours | Makes devotional guides come alive |
| **8** | Guided Rosary | Content curation + BibleGet | 5 hours | Major devotional feature |
| **9** | Liturgical ICS Subscription | LitCal API | 30 min | Quick win |
| **10** | Stations of the Cross Guide | Content + BibleGet | 4 hours | Seasonal (Lent) feature |
| **11** | Novena Tracker | Content curation | 4 hours | Retention/engagement feature |
| **12** | Latin/English Toggle | BibleGet | 1 hour | Delight for traditional users |

Items 1-5 can ship as a single batch. Items 6-9 as a second batch. Items 10-12 as a third.

---

## APPENDIX: COMPLETE REPO REFERENCE

All repos mentioned in this report with links and license status:

```
APIS & DATA:
├── litcal.johnromanodorazio.com/api/v5     — Liturgical Calendar (free, no auth, CORS)
├── query.bibleget.io/v3                     — Bible verse lookup (free, no auth, CORS)
├── nossbigg/catechism-ccc-json              — CCC in JSON (2,865 paragraphs)
├── aseemsavio/catholicism-in-json           — CCC + Canon Law + GIRM in JSON
├── Jacob-Gray/summa.json                    — Summa Theologica in JSON (public domain)
├── Geremia/AquinasOperaOmnia               — Complete Aquinas works (bilingual)
├── borderstech/romanus                      — Roman Catechism (Council of Trent)
├── borderstech/vulgata                      — DRB English + Clementina Latin
├── ChrisVo/cardinals                        — Cardinals list in JSON
├── romcal/romcal                            — JS liturgical calendar library (npm)
├── cpbjr/catholic-readings-api              — Saints + readings (GitHub Pages, spotty)
└── GomezMig03/MotivationalAPI              — Catholic motivational phrases

APPS TO EXAMINE FOR UX PATTERNS:
├── kas-catholic/confessit-web               — Examination of conscience PWA (MIT)
├── marchiartur/pray-the-rosary              — Rosary PWA
├── Krixec/Rosarium                          — Multilingual rosary (Codeberg)
├── mftruso/st-andrew-novena                 — Novena tracker (Flutter)
├── nossbigg/catechism                       — CCC web reader (React)
├── masaharumori7/doctors-of-the-church      — 37 Doctors gallery
├── matefs/Citation-Generator                — Saint quote generator
└── shineministry/codeofcanonlaw             — Canon Law with search
```
