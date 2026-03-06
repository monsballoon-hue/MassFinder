# MassFinder Anti-Patterns & Known Gotchas

> Things that have broken before, or will break if you're not careful.
> Read this before making changes.

---

## Service Worker Cache (Severity: HIGH)

**The Bug:** You deploy a code change but users see the old version.

**Why:** The service worker caches `index.html` with a cache-first strategy. Returning users get the cached copy. The cache only invalidates when `CACHE_NAME` in `sw.js` changes.

**Fix:** ALWAYS bump `CACHE_NAME` in `sw.js` when deploying code changes. Format: `massfinder-v2_YYYYMMDD_NN`.

**Testing:** Use Chrome Incognito (bypasses SW entirely) as ground truth. If it works in incognito but not normal Chrome, it's a cache issue.

**Related:** Different devices/browsers hold different cached versions. There is no way to force all users to update simultaneously. The `activate` event cleans up old caches, but only when the user revisits the site and the new SW installs.

---

## Invisible Overlay Click Blocking (Severity: HIGH)

**The Bug:** Buttons or cards stop responding to clicks on desktop, but work fine on mobile.

**Why:** A filter overlay or backdrop element is in its "closed" state but still covers the page because it lacks `pointer-events: none`.

**Fix:** Every overlay/backdrop must have:
```css
.overlay-closed-state {
  pointer-events: none;  /* Critical — allows clicks to pass through */
  opacity: 0;
}
.overlay-open-state {
  pointer-events: auto;
  opacity: 1;
}
```

**Pattern in codebase:** `.detail-backdrop` and `.filters-overlay` use `pointer-events: none` in their default state and `pointer-events: auto` when `.open` class is added.

---

## Web3Forms Silent Failures (Severity: MEDIUM)

**The Bug:** Form submissions appear to succeed (no error) but emails never arrive.

**Causes:**
1. Missing `to:` field in POST body — Web3Forms requires explicit recipient, not just access key registration.
2. Using `type` as a field name — this is reserved by Web3Forms API and silently consumed.

**Fix:** Always include `to: 'massfinderapp@gmail.com'` and use `feedback_type` instead of `type`.

---

## Node.js v12 Syntax Failures (Severity: LOW)

**The Bug:** `node --check index.html` or running JS files through Node fails with syntax errors.

**Why:** The container/CI environment runs Node.js v12, which doesn't support optional chaining (`?.`) or nullish coalescing (`??`). These work fine in all modern browsers.

**Fix:** This is a non-issue for production. Browser code can use `?.` and `??` freely. Only maintenance scripts in `scripts/` need to avoid these operators if they're run via Node on this machine.

---

## Body Scroll Bleed on iOS (Severity: MEDIUM)

**The Bug:** When a modal panel is open, scrolling to the end of the panel content causes the background page to scroll.

**Fix:** Two mechanisms:
1. `overscroll-behavior: contain` on the panel element
2. `document.body.style.overflow = 'hidden'` when panel opens, restored on close

Both are needed. `overscroll-behavior` handles the physics; `overflow: hidden` is the fallback.

---

## Focus Trap Leaks (Severity: MEDIUM)

**The Bug:** With a detail panel open, pressing Tab cycles focus to elements behind the panel.

**Fix:** `trapFocus()` is called on panel open, `releaseFocus()` on close. The trap listens for Tab/Shift+Tab keydown and wraps focus within the panel's focusable elements.

**Gotcha:** If new focusable elements are added to a panel dynamically (e.g., after accordion expand), the focusable-element query may miss them. The current implementation queries once on trap. For now this is acceptable.

---

## Duplicate Service IDs (Severity: HIGH)

**The Bug:** Two services in the same parish have the same ID. Filtering, rendering, or editing may reference the wrong one.

**Prevention:** Service ID format encodes uniqueness: `{parish}-{type}-{day}-{time}-{location}`. If two services genuinely share all those attributes, they're likely duplicates in the data.

**Detection:** The schema doesn't enforce uniqueness across the array (JSON Schema limitation). Use the prep-review script or manual inspection.

---

## Saturday Mass Type Confusion (Severity: MEDIUM)

**The Bug:** A Saturday Mass is tagged as `sunday_mass` when it should be `daily_mass`, or vice versa.

**Rule:** Saturday Mass at 2:00 PM or later → `sunday_mass` (vigil). Before 2:00 PM → `daily_mass`. This is a liturgical rule, not an arbitrary cutoff.

---

## Location Permission Timing (Severity: LOW)

**The Bug:** User denies location permission, then sorting by proximity doesn't work.

**Current behavior:** Falls back to name sort with a toast message explaining why. No way to re-prompt — the browser remembers the denial.

**Best practice:** Only request location when the user takes an action that needs it (tapping "By distance" sort), never on page load.

---

## Stale Data After Background Tab (Severity: LOW)

**The Bug:** User leaves the app open in a background tab for hours, then returns. The "next service" calculations are stale (based on old `getNow()` values).

**Current mitigation:** `getNow()` is called fresh in render functions, not cached. But if the user doesn't trigger a re-render (scroll, tab switch, etc.), the displayed times may be stale.

**Acceptable for now.** A visibility-change listener could trigger re-render, but it's not critical.

---

## JSON Parse After Fetch (Severity: HIGH)

**The Bug:** `fetch('parish_data.json')` returns HTML (404 page) instead of JSON, causing a parse error.

**When:** Happens if the file path is wrong, or if Vercel serves a custom 404 page.

**Fix:** Always check `response.ok` before calling `.json()`:
```javascript
const res = await fetch('parish_data.json');
if (!res.ok) throw new Error('Failed to load parish data');
const data = await res.json();
```

---

## CSS Custom Property Fallbacks (Severity: LOW)

**The Bug:** Very old browsers (pre-2017) that don't support CSS custom properties see no styling.

**Current stance:** Not supported. The browser target is last 2 versions of Safari and Chrome. Custom properties have been supported since Safari 9.1 (2016) and Chrome 49 (2016).

---

## Accordion State After Panel Re-Open (Severity: LOW)

**The Bug:** User opens parish detail, expands all accordions, closes panel, opens a different parish — accordion states from the previous parish persist.

**Current behavior:** The detail panel's HTML is rebuilt entirely on each `openDetail()` call, so this doesn't happen with the current implementation. But be aware: if optimization attempts cache panel HTML, this bug will surface.

---

## Checklist: Before Adding Any New Feature

1. ☐ Does it require a new external dependency? (Probably shouldn't)
2. ☐ Does it add an overlay/backdrop? (Needs `pointer-events: none` in closed state)
3. ☐ Does it add a modal/panel? (Needs focus trap, Escape key handler, body scroll lock)
4. ☐ Does it fetch from a new API? (Add hostname to SW `NETWORK_ONLY_HOSTS`)
5. ☐ Does it use Web3Forms? (Include `to:` field, avoid `type` field name)
6. ☐ Does it generate HTML from data? (Use `esc()` for all data-derived strings)
7. ☐ Will service worker cache it? (Bump `CACHE_NAME` on deploy)
