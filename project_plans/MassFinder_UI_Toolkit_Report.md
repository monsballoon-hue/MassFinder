# MassFinder — UI Toolkit & Building Blocks Report
## Open Source Components to Power Catholic Features

**Date:** March 7, 2026
**Context:** MassFinder loads exactly 2 CDN libraries today: Leaflet (map) + MarkerCluster. Every component below is evaluated for whether it earns a place alongside those two.

---

## PHILOSOPHY: BUILD VS. IMPORT

MassFinder is a single-file PWA. Every kilobyte matters. Every CDN dependency is a potential failure point for an older parishioner on slow church WiFi.

**The decision framework for each component:**
- **< 50 lines of CSS/JS to build yourself?** → Build it. Inline it. Zero dependencies.
- **50-200 lines and someone's already solved the hard parts (touch gestures, accessibility, SVG math)?** → Import the smallest proven lib from CDN.
- **> 200 lines of non-trivial interaction (carousels, bottom sheets, animation orchestration)?** → Import, but only if it's framework-agnostic, CDN-available, and under ~10KB gzipped.

**Rule: If it touches a finger on a phone screen, use a library. Touch gesture math is the one thing you never want to hand-roll.**

---

## CATEGORY 1: BOTTOM SHEET (for CCC references, saint bios, verse details)

This is the single most useful UI primitive for the new features. Tapping a CCC citation, a saint name, or a verse reference should slide up a beautiful panel from the bottom — the iOS pattern your 50+ users already understand from Apple Maps, Apple Music, and every modern iOS app.

### RECOMMENDED: Pure CSS approach (build it yourself)

The hard truth: every bottom sheet library I evaluated is either too heavy, requires ES modules (breaks your `var`-based codebase), or is React-coupled. But the core pattern is just 40 lines of CSS + 20 lines of JS.

**The recipe:**
```css
.sheet-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4);
  opacity:0; pointer-events:none; transition:opacity .3s; z-index:1000; }
.sheet-overlay.open { opacity:1; pointer-events:auto; }
.sheet-panel { position:fixed; bottom:0; left:0; right:0; max-height:70vh;
  background:var(--color-surface); border-radius:12px 12px 0 0;
  transform:translateY(100%); transition:transform .3s ease;
  box-shadow:0 -4px 20px rgba(0,0,0,.12); z-index:1001;
  overflow-y:auto; -webkit-overflow-scrolling:touch; }
.sheet-overlay.open .sheet-panel { transform:translateY(0); }
.sheet-handle { width:36px; height:4px; border-radius:2px;
  background:var(--color-border-light); margin:12px auto; }
```
```javascript
function openSheet(html) {
  var el = document.getElementById('bottomSheet');
  el.querySelector('.sheet-body').innerHTML = html;
  el.classList.add('open');
}
function closeSheet() { document.getElementById('bottomSheet').classList.remove('open'); }
```

**Use for:** CCC paragraph popups, saint biography cards, verse detail views, confession walkthrough steps.

**If you later need swipe-to-dismiss:** Add ~30 lines of pointer event handling. Or grab the pattern from `cssscript.com/touch-enabled-bottom-sheet/` which is a zero-dependency vanilla JS implementation (~3KB) with hardware-accelerated drag. Don't import it as a library — just read the source and adapt the `dragStart`/`dragMove`/`dragStop` pattern into your existing code.

---

## CATEGORY 2: CARD SWIPER / CAROUSEL (for Stations of the Cross, Rosary decades, Examination)

These features all share the same UX: a series of full-width cards the user swipes through. Station 1 → Station 2 → ... → Station 14. Decade 1 → Decade 2 → ... → Decade 5. This is the one place where importing a library genuinely saves you from touch-gesture hell.

### RECOMMENDED: Splide.js

| Property | Value |
|----------|-------|
| **Repo** | https://github.com/Splidejs/splide |
| **CDN** | `https://cdn.jsdelivr.net/npm/@splidejs/splide@4/dist/js/splide.min.js` |
| **CSS** | `https://cdn.jsdelivr.net/npm/@splidejs/splide@4/dist/css/splide-core.min.css` |
| **Size** | ~12KB JS gzipped, ~2KB CSS (core only) |
| **Dependencies** | Zero |
| **Framework** | Vanilla JS, no build tools needed |
| **A11y** | Full ARIA support, keyboard nav, screen reader tested |
| **Touch** | Native touch/pointer events, momentum scrolling |
| **License** | MIT |

**Why Splide over alternatives:**
- **Swiper** (40KB+) — too heavy, designed for complex apps
- **Glide.js** (8KB) — good but no pagination dots built in
- **Embla** (headless, requires you to build all UI) — great for React, painful for vanilla
- **Siema** (2KB) — abandoned since 2019, no a11y

**Splide gives you for free:**
- Swipe between cards with momentum
- Pagination dots (Station 3/14, Decade 2/5)
- Keyboard arrow navigation
- `autoHeight` — cards of different content length render correctly
- Custom progress bar via Splide's `move` event

**Usage pattern for Stations of the Cross:**
```html
<div id="stationsCarousel" class="splide">
  <div class="splide__track"><ul class="splide__list">
    <li class="splide__slide"><!-- Station 1 content --></li>
    <li class="splide__slide"><!-- Station 2 content --></li>
    <!-- ... 14 total -->
  </ul></div>
</div>
<script>
new Splide('#stationsCarousel', {
  type: 'slide', perPage: 1, arrows: false,
  pagination: true, speed: 400, gap: '1rem'
}).mount();
</script>
```

**Also use for:** Rosary decades (5 slides), Examination of Conscience commandments (10 slides), potential onboarding walkthrough.

### ALTERNATIVE: CSS scroll-snap (zero JS)

If you want zero dependencies, CSS `scroll-snap` gives you 80% of the swipe behavior natively:

```css
.card-track { display:flex; overflow-x:auto; scroll-snap-type:x mandatory;
  -webkit-overflow-scrolling:touch; scrollbar-width:none; }
.card-track::-webkit-scrollbar { display:none; }
.card-slide { min-width:100%; scroll-snap-align:center; flex-shrink:0; }
```

No pagination dots, no progress bar, no keyboard nav — but it works. Good enough for a first pass; upgrade to Splide later if users engage with the feature.

---

## CATEGORY 3: SCROLL ANIMATIONS (for readings, devotional content, card reveals)

Subtle entrance animations as content scrolls into view — readings fading in, saint cards sliding up, devotional sections revealing. The difference between "website" and "app" feel.

### RECOMMENDED: sal.js (Scroll Animation Library)

| Property | Value |
|----------|-------|
| **Repo** | https://github.com/mciastek/sal |
| **CDN JS** | `https://cdn.jsdelivr.net/npm/sal.js@0.8.5/dist/sal.js` |
| **CDN CSS** | `https://cdn.jsdelivr.net/npm/sal.js@0.8.5/dist/sal.css` |
| **Size** | ~2.8KB gzipped (JS + CSS combined) |
| **Dependencies** | Zero |
| **Engine** | IntersectionObserver (native, performant) |
| **License** | MIT |

**Why sal.js:** It's the smallest scroll animation library that actually works well. AOS is more popular but 5.7KB+23KB CSS — absurd for what it does. sal.js gives you the exact same `data-sal="slide-up"` declarative API in a fraction of the size.

**Usage:**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sal.js@0.8.5/dist/sal.css">
<script src="https://cdn.jsdelivr.net/npm/sal.js@0.8.5/dist/sal.js"></script>

<div class="saint-card" data-sal="slide-up" data-sal-duration="400" data-sal-delay="100">
  <!-- Saint content -->
</div>

<script>sal({ threshold: 0.2, once: true });</script>
```

**`once: true`** is critical — animate on first appearance only. Repeating animations feel cheap.

**Use for:** Saint card entrance on Today tab, reading sections expanding, devotional guide cards, any dynamically loaded content that benefits from a subtle "here I am" moment.

### ALTERNATIVE: Zero-dependency (build yourself, ~15 lines)

```javascript
var observer = new IntersectionObserver(function(entries) {
  entries.forEach(function(e) {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('[data-reveal]').forEach(function(el) { observer.observe(el); });
```
```css
[data-reveal] { opacity:0; transform:translateY(20px); transition:opacity .4s, transform .4s; }
[data-reveal].visible { opacity:1; transform:translateY(0); }
```

15 lines. Same result for basic fade-up. Use this if you don't want another CDN dependency. Add sal.js only if you need varied animation types (slide-left, zoom-in, etc.).

---

## CATEGORY 4: PROGRESS INDICATORS (for Rosary, Novena, Stations, Examination)

Multiple features need "you're on step 3 of 14" visualization. Two patterns needed:

### 4A: Linear Step Indicator (Stations, Examination)

**Build yourself — pure CSS, ~20 lines:**
```css
.step-track { display:flex; gap:4px; padding:0 var(--space-4); }
.step-dot { flex:1; height:3px; border-radius:2px; background:var(--color-border-light);
  transition:background .3s; }
.step-dot.active { background:var(--color-accent); }
.step-dot.done { background:var(--color-accent-text); }
```

Render 14 dots for Stations, 10 for Examination commandments, 5 for Rosary decades. Update `.active` class on navigation. Integrates with Splide's `move` event if using the carousel.

**No library needed.** This is 20 lines of CSS that perfectly matches your design system.

### 4B: Circular/Ring Progress (Novena tracker — day 6 of 9)

For the novena tracker, a circular ring showing 6/9 days completed is visually elegant and compact.

### RECOMMENDED: Pure SVG (build yourself, ~25 lines)

```javascript
function renderRing(containerId, current, total) {
  var r = 28, c = 2 * Math.PI * r;
  var pct = current / total;
  var offset = c * (1 - pct);
  var el = document.getElementById(containerId);
  el.innerHTML = '<svg width="64" height="64" viewBox="0 0 64 64">'
    + '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--color-border-light)" stroke-width="4"/>'
    + '<circle cx="32" cy="32" r="' + r + '" fill="none" stroke="var(--color-accent)" stroke-width="4"'
    + ' stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"'
    + ' stroke-linecap="round" transform="rotate(-90 32 32)"'
    + ' style="transition:stroke-dashoffset .6s ease"/>'
    + '<text x="32" y="36" text-anchor="middle" font-size="16" font-weight="600"'
    + ' fill="var(--color-text-primary)">' + current + '</text>'
    + '</svg>';
}
```

25 lines. No dependency. SVG `stroke-dasharray` / `stroke-dashoffset` is the standard technique — it's how every circular progress library works internally. Skip the library, write the 25 lines.

**If you want animated counting:** `tomickigrzegorz/circular-progress-bar` (~2KB, CDN available at jsdelivr) adds animated value transitions. Only worth importing if the novena tracker becomes a prominent feature.

---

## CATEGORY 5: TYPOGRAPHY RENDERING (for Bible verses)

The single biggest visual improvement for the readings section is proper typographic rendering of Scripture. BibleGet returns formatting tags (`<pof>`, `<poi>`, `<sm>`) that need to become beautiful text.

### RECOMMENDED: Pure CSS (no library needed)

Bible typography is a CSS problem, not a JavaScript problem. The formatting tags map directly to CSS classes:

```css
/* Poetic first line — hanging indent, like a hymnal */
.v-pof { display:block; padding-left:var(--space-5); text-indent:calc(-1 * var(--space-5));
  margin-top:var(--space-3); }
/* Poetic indented line — continuation */
.v-poi { display:block; padding-left:calc(var(--space-5) + var(--space-4)); }
/* Standard poetic line */
.v-po { display:block; padding-left:var(--space-5); margin-top:var(--space-1); }
/* Small caps for LORD / GOD */
.v-sc { font-variant:small-caps; letter-spacing:0.03em; }
/* Verse number superscript */
.v-num { font-size:0.65em; font-weight:var(--weight-semibold); color:var(--color-accent-text);
  vertical-align:super; line-height:0; margin:0 2px 0 4px; font-feature-settings:'tnum'; }
.v-num:first-child { margin-left:0; }
/* Verse container */
.bible-v { line-height:1.85; }
/* Red letter (words of Christ — optional future feature) */
.v-red { color:#B91C1C; }
```

This is the CSS that makes the readings look like they're being read from a Bible. The key details: `line-height: 1.85` for readability, `font-variant: small-caps` for LORD (how every printed Bible renders the Tetragrammaton), hanging indent on poetic first lines (how the Lectionary formats Psalms).

**No library.** Typography IS CSS.

### OPTIONAL ENHANCEMENT: Dropcap for Gospel readings

A large decorative first letter on the Gospel reading — the way illuminated manuscripts begin:

```css
.reading-gospel .reading-para:first-of-type::first-letter {
  float:left; font-size:3.2em; line-height:0.8; padding-right:6px;
  font-family:var(--font-display); color:var(--color-accent);
  font-weight:700; margin-top:4px;
}
```

6 lines of CSS. Massive visual impact. The kind of detail that makes a Catholic user think "someone who cares about this made this app."

---

## CATEGORY 6: TOAST / SNACKBAR NOTIFICATIONS (for HDO alerts, novena reminders)

Small non-blocking notifications: "Tomorrow is a Holy Day of Obligation" or "Day 6 of your St. Joseph Novena."

### RECOMMENDED: Build yourself (~30 lines)

```javascript
function showToast(msg, duration) {
  var t = document.createElement('div');
  t.className = 'mf-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(function() { t.classList.add('show'); });
  setTimeout(function() {
    t.classList.remove('show');
    setTimeout(function() { t.remove(); }, 300);
  }, duration || 4000);
}
```
```css
.mf-toast { position:fixed; bottom:calc(80px + env(safe-area-inset-bottom));
  left:50%; transform:translateX(-50%) translateY(20px); opacity:0;
  background:var(--color-text-primary); color:var(--color-surface);
  padding:var(--space-3) var(--space-5); border-radius:var(--radius-md);
  font-size:var(--text-sm); font-weight:var(--weight-medium);
  box-shadow:0 4px 12px rgba(0,0,0,.15); z-index:999;
  transition:opacity .3s, transform .3s; pointer-events:none;
  max-width:calc(100vw - 32px); text-align:center; }
.mf-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
```

**No library needed.** The `bottom: calc(80px + env(safe-area-inset-bottom))` positions it above MassFinder's bottom tab bar + iPhone safe area. 30 lines total.

---

## CATEGORY 7: LAZY-LOADED JSON DATA FILES

Several features need JSON data that shouldn't ship in the initial page load. Strategy for each:

| Data File | Size (est.) | Load Strategy | Host |
|-----------|------------|---------------|------|
| `catechism.json` (CCC paragraphs) | ~2MB | Lazy-fetch on first CCC tap. Cache in `window._cccCache`. | Vercel static file in repo |
| `rosary-mysteries.json` | ~8KB | Inline in `index.html` as `var ROSARY_MYSTERIES = {...}` | Inline |
| `stations-meditations.json` | ~12KB | Inline in `index.html` | Inline |
| `examination-questions.json` | ~15KB | Inline in `index.html` | Inline |
| `novena-prayers.json` (4-5 novenas) | ~20KB | Inline in `index.html` | Inline |
| `saints-bios.json` (~100 entries) | ~40KB | Lazy-fetch. Cache in `window._saintsCache`. | Vercel static file |
| `summa-excerpts.json` (curated 365) | ~60KB | Lazy-fetch. Cache in `window._summaCache`. | Vercel static file |

**Rule of thumb:** Under 20KB → inline. Over 20KB → lazy-load from Vercel and cache in memory.

**Service worker caching:** Add all lazy-load JSON URLs to the service worker's cache-on-first-fetch list (not pre-cache — that would bloat initial install). After first load, they're available offline.

```javascript
// In sw.js fetch handler, for JSON files:
if (url.pathname.endsWith('.json') && !NETWORK_ONLY_HOSTS.some(h => url.host === h)) {
  // Cache-first for static JSON data files
  return caches.match(request).then(function(cached) {
    return cached || fetch(request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(c) { c.put(request, clone); });
      return response;
    });
  });
}
```

---

## CATEGORY 8: WHAT YOU ALREADY HAVE (leverage better)

Before adding anything new, recognize MassFinder already has powerful primitives:

| Existing Pattern | Where | Reuse For |
|------------------|-------|-----------|
| Expandable card (`details/summary`) | Devotional guides (line 2598+) | Examination commandments, FAQ sections |
| Tab system | Main navigation | Sub-tabs within Rosary (Joyful/Sorrowful/Glorious/Luminous) |
| Filter chips | Service type filters (line 699) | Novena selection chips, translation toggle |
| Card with border-left accent | Saint card (`.saint-card`, line 647) | Daily verse card, HDO alert card, novena progress card |
| External link pattern | Saint source links (`.saint-source`) | "Read more" links for saint bios, CCC citations |
| `esc()` function | Used throughout for XSS-safe rendering | All new content rendering |
| `getNow()` | Time-aware date function | Liturgical day calculations |

The design system variables (`--color-accent`, `--space-3`, `--font-display`, etc.) mean new features automatically inherit the MassFinder look. Don't fight this — lean into it hard.

---

## FINAL CDN BUDGET

Current MassFinder CDN footprint:
```
leaflet.min.js        — 42KB gzipped
leaflet.markercluster — 10KB gzipped
leaflet CSS (3 files) — ~5KB gzipped
TOTAL: ~57KB
```

Proposed additions (only if features justify them):

```
splide.min.js         — 12KB gzipped (carousel for Stations/Rosary)
splide-core.min.css   —  2KB gzipped
sal.js + sal.css      —  3KB gzipped (scroll animations) [OPTIONAL]
TOTAL NEW: 14-17KB
```

Everything else (bottom sheet, toast, progress indicators, typography, step dots) should be hand-built and inlined. The total new CDN cost is less than what a single hero image would weigh.

---

## DECISION SUMMARY

| Component | Verdict | Source |
|-----------|---------|--------|
| Bottom sheet | **Build yourself** (~60 lines CSS/JS) | Adapt pattern from cssscript touch-enabled example |
| Card swiper | **Import Splide.js** (14KB) OR use CSS scroll-snap (0KB) | `cdn.jsdelivr.net/npm/@splidejs/splide@4` |
| Scroll animations | **Build yourself** (15 lines) OR **import sal.js** (3KB) | `cdn.jsdelivr.net/npm/sal.js@0.8.5` |
| Step progress dots | **Build yourself** (~20 lines CSS) | Pure CSS flexbox |
| Circular progress ring | **Build yourself** (~25 lines SVG JS) | Pure SVG stroke-dashoffset |
| Bible typography | **Build yourself** (~30 lines CSS) | CSS font-variant, indents, line-height |
| Gospel dropcap | **Build yourself** (6 lines CSS) | CSS `::first-letter` |
| Toast notifications | **Build yourself** (~30 lines CSS/JS) | CSS transitions + setTimeout |
| JSON lazy loading | **Build yourself** (~10 lines in sw.js) | Fetch + cache pattern |

**Net new external dependencies: 1 (Splide) or 0 (CSS scroll-snap).**

That's the toolkit. Everything above maps directly to the features in the Feature Discovery Report — the bottom sheet powers CCC references and saint bios, the swiper powers Stations and Rosary, the typography powers BibleGet readings, and the progress indicators power the novena tracker. The Catholic data repos provide the content; these building blocks provide the presentation.
