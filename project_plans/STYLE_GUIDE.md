# MassFinder Design System

> **Governing framework:** Apple Human Interface Guidelines (HIG).
> Every UI decision defaults to HIG unless explicitly overridden below.
> When in doubt: progressive disclosure, one task per view, reduce visual noise.

---

## Design Tokens — USE THESE, NEVER RAW VALUES

### Colors

| Token | Hex | Use |
|-------|-----|-----|
| `--color-primary` | `#2C3E5A` | Navy. Headers, active tabs, primary buttons, text emphasis |
| `--color-primary-light` | `#3D5278` | Hover states on primary elements |
| `--color-primary-muted` | `#6B7A94` | Focus rings, secondary icons |
| `--color-accent` | `#B8963F` | Gold. YC branding, accent highlights, pulse dots |
| `--color-accent-text` | `#7D6520` | Gold text on light backgrounds (meets contrast) |
| `--color-accent-light` | `#D4B05C` | Lighter gold for decorative use only |
| `--color-accent-pale` | `#F5EDD8` | Gold background tint (badges, callouts) |
| `--color-bg` | `#F8F7F4` | Page background. Warm off-white, NOT pure white |
| `--color-surface` | `#FFFFFF` | Card/panel backgrounds |
| `--color-surface-hover` | `#F5F3EF` | Hover state on surface elements |
| `--color-text-primary` | `#1A1E26` | Body text. Near-black, NOT pure black |
| `--color-text-secondary` | `#5C6370` | Supporting text, subtitles |
| `--color-text-tertiary` | `#747981` | Timestamps, distances, meta labels |
| `--color-text-inverse` | `#FFFFFF` | Text on dark backgrounds |
| `--color-verified` | `#4A7C59` | Green. Verification badges, "live" indicators |
| `--color-verified-bg` | `#EDF5F0` | Background for verified badges |
| `--color-warning` | `#D97706` | Amber. Unverified warnings, expiring content |
| `--color-warning-bg` | `#FEF5E7` | Background for warning callouts |
| `--color-error` | `#B91C1C` | Red. Errors only — never for decorative use |
| `--color-info` | `#3478C6` | Blue. Links, informational badges |
| `--color-info-bg` | `#EFF6FF` | Background for info badges and filter pills |
| `--color-border` | `#E5E2DC` | Standard borders (inputs, dividers) |
| `--color-border-light` | `#EFECE7` | Subtle dividers within panels |
| `--color-fav` | `#E11D48` | Heart/favorite icon when active |

**Liturgical season overrides:**
- Lent: `#7C3AED` (purple) — used for Lenten chip, seasonal badges
- Advent: reserved, not yet implemented
- Christmas/Easter: reserved, not yet implemented

**Rules:**
- NEVER use raw hex values. Always reference `var(--color-*)`.
- NEVER use pure black (`#000`) or pure white (`#FFF`) for text or backgrounds.
- Gold (`--color-accent`) is reserved for YC branding and special emphasis. Do not overuse.
- The palette is intentionally warm and muted. No saturated primaries, no neon.

### Typography

| Token | Value | Use |
|-------|-------|-----|
| `--font-display` | `'Playfair Display', Georgia, serif` | Headings, parish names in detail panel, section titles |
| `--font-body` | `'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` | Everything else |
| `--text-xs` | `0.8125rem` (13px) | Meta labels, badges, timestamps, distances |
| `--text-sm` | `0.9375rem` (15px) | Secondary text, card subtitles, button labels |
| `--text-base` | `1.0625rem` (17px) | Body text, input text |
| `--text-lg` | `1.125rem` (18px) | Card names, section headers |
| `--text-xl` | `1.25rem` (20px) | Section titles |
| `--text-2xl` | `1.5rem` (24px) | Next-service time display, event titles |
| `--text-3xl` | `1.75rem` (28px) | Detail panel parish name |
| `--weight-regular` | `400` | Body text |
| `--weight-medium` | `500` | Badges, labels, subtle emphasis |
| `--weight-semibold` | `600` | Headings, card names, buttons |

**Rules:**
- `--font-display` (Playfair) is ONLY for headings and names. Never for body text, labels, or UI chrome.
- Font sizes use rem tokens. Never use `px` for font sizes.
- Never use `font-weight: bold` or `700` in body text. Use `--weight-semibold` (`600`) maximum.
- Playfair Display loads at weights 600 and 700 only. Do not request other weights.

### Spacing

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-12` | `48px` |

**Rules:**
- Use spacing tokens for ALL margins, paddings, and gaps.
- The scale is 4px-based. Do not introduce intermediate values (e.g., `10px`, `14px`).
- Content max-width is `--max-width` (`680px`). All content containers use `max-width: var(--max-width); margin: 0 auto;`.

### Radii

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | `8px` | Buttons, inputs, small elements |
| `--radius-md` | `12px` | Cards, panels, overlays |
| `--radius-lg` | `16px` | Detail panel top corners, large modals |
| `--radius-full` | `999px` | Chips, badges, pills, circular buttons |

### Shadows

| Token | Use |
|-------|-----|
| `--shadow-card` | Default card resting state |
| `--shadow-card-hover` | Card hover state |
| `--shadow-elevated` | Detail panel, overlays, anything above the page |
| `--shadow-tab-bar` | Bottom tab bar only |

**Rules:**
- Cards at rest ALWAYS use `--shadow-card`.
- Never add custom box-shadows. If a new elevation level is needed, propose a new token.

### Transitions

| Token | Value | Use |
|-------|-------|-----|
| `--transition-fast` | `150ms var(--ease-out)` | Hover states, toggles, small interactions |
| `--transition-base` | `250ms var(--ease-out)` | Panel slides, card hover, opacity changes |
| `--ease-out` | `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Standard easing for all transitions |

**Rules:**
- All transitions use `var(--ease-out)`. No `ease`, `ease-in-out`, or `linear` unless physics require it.
- Panel slide-ins use `0.35s var(--ease-out)` (detail panel, event panel, filters overlay).
- Respect `prefers-reduced-motion`:
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```

---

## Component Patterns

### Cards (`.parish-card`)

```
┌─────────────────────────────────────┐
│ Card Name ✓          2.3 mi    ♡   │
│ Town, MA                            │
│                                     │
│ 4:00 PM  ← next service time       │
│ Sunday Mass · Tomorrow              │
└─────────────────────────────────────┘
```

- Background: `var(--color-surface)`
- Border-radius: `var(--radius-md)`
- Padding: `var(--space-5)`
- Shadow: `var(--shadow-card)` → `var(--shadow-card-hover)` on hover
- Active press: `transform: scale(0.995)`
- Gap between cards: `var(--space-3)`
- Cursor: `pointer` (entire card is clickable)
- Card name: `--text-lg`, `--weight-semibold`
- Town: `--text-sm`, `--color-text-secondary`
- Next time: `--text-2xl`, `--weight-semibold`, `--color-primary`
- Distance: `--text-xs`, `--color-text-tertiary`
- Favorite button: 44×44px tap target, positioned top-right

### YC Event Cards (`.yc-card`)

- Background: `linear-gradient(135deg, #FBF8F1 0%, #F5EDD8 100%)` (warm gold gradient)
- Left border: `4px solid var(--color-accent)`
- Otherwise follows card pattern for padding, radius, shadow

### Chips (`.chip`)

- Height: `44px` (meets touch target requirement)
- Padding: `0 var(--space-4)`
- Border-radius: `var(--radius-full)`
- Default: white bg, `--color-border` border, `--color-text-secondary` text
- Active: `--color-primary` bg, white text, `--color-primary` border
- Active press: `transform: scale(0.97)`
- Chips scroll horizontally with fade mask on right edge

### Detail Panel (`.detail-panel`)

- Slides up from bottom: `transform: translateY(100%)` → `translateY(0)`
- Max-height: `92vh` / `92dvh`
- Top corners: `var(--radius-lg)`
- Drag handle: 36×4px bar, `var(--color-border)`, centered
- Sticky handle area for scroll
- Desktop: centered at `--max-width`, uses `translate(-50%, 0)`
- Shadow: `var(--shadow-elevated)`
- Parish name: `--font-display`, `--text-3xl`, weight `700`
- Content sections: accordion pattern with `<details>/<summary>` or manual toggle

### Accordion Sections

- Header: full-width button, chevron rotates 180° when expanded
- Default: first section open, rest collapsed
- Chevron: right-aligned, `var(--transition-fast)` rotation
- Content: padded `var(--space-4)` inside

### Badges

- Border-radius: `var(--radius-full)`
- Font-size: `var(--text-xs)`
- Font-weight: `var(--weight-medium)` or `--weight-semibold`
- Padding: `4px 10px` (small), `5px 12px` (standard)
- Always pair text color + background from the same semantic group:
  - Verified: `--color-verified` + `--color-verified-bg`
  - Warning: `--color-warning` + `--color-warning-bg`
  - Info: `--color-primary` + `--color-info-bg`
  - YC: `--color-accent-text` + `--color-accent-pale`

### Tab Bar

- Fixed bottom, full width
- Shadow: `var(--shadow-tab-bar)`
- Background: `var(--color-surface)`
- Safe area: `padding-bottom: var(--safe-bottom)` for iPhone notch/home indicator
- Tab items: icon (24×24) + label below
- Active tab: `--color-primary`; inactive: `--color-text-tertiary`
- Height: `var(--tab-bar-height)` (64px)
- Four tabs: Find, Map, Saved, More

### Buttons & Tap Targets

- **MINIMUM 44×44px** for all interactive elements (Apple HIG requirement).
- This is NON-NEGOTIABLE. Buttons, links, icons — if a finger can tap it, it's 44×44px minimum.
- Technique: use `min-width: 44px; min-height: 44px` or pad smaller visuals with transparent hit area.
- Favorite hearts, close buttons, calendar buttons all use this pattern.

### Toast Messages

- Fixed bottom-center, above tab bar
- Background: `var(--color-primary)`, white text
- Border-radius: `var(--radius-full)`
- Auto-dismiss after timeout
- Slide up + fade in animation

---

## Layout Rules

1. **Max-width container:** All content lives within `max-width: var(--max-width)` (680px), centered with `margin: 0 auto`.
2. **Horizontal padding:** Content sections use `padding: * var(--space-4)` for consistent left/right gutters.
3. **Body padding-bottom:** Account for tab bar: `calc(var(--tab-bar-height) + var(--safe-bottom) + var(--space-4))`.
4. **No horizontal scroll** on the page body. Only chip bars and carousels scroll horizontally.
5. **Sticky header:** `.top-header` is `position: sticky; top: 0; z-index: 90`.
6. **Z-index scale:** Header: 90, Tab bar: 100, Detail panel: 1001, Event panel: 1002, Filters overlay: uses backdrop at 1000. Do not introduce z-indexes outside this range without documenting.

---

## Icon Conventions

- **All icons are inline SVGs.** No icon fonts, no external icon libraries, no `<img>` tags for icons.
- ViewBox: `viewBox="0 0 24 24"` (24×24 grid)
- Stroke-based: `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`
- Color: inherited via `currentColor` — never hardcode colors in SVG markup.
- Size: controlled by parent CSS (`width` / `height`), typically 14–24px depending on context.
- Source style: Lucide/Feather-compatible (simple, geometric, 2px stroke).
- When adding new icons, match the existing stroke weight and style. Do not mix filled and outlined icons in the same context.

---

## Color Palette Philosophy

The palette is **warm, muted, and restrained**. It communicates trust and calm — appropriate for a Catholic service directory used by parishioners aged 20–80+.

- Navy + Gold is the brand identity. Navy dominates; gold accents sparingly.
- The background is warm off-white (`#F8F7F4`), not clinical pure white.
- Shadows are soft and warm-toned (rgba with the dark navy base, not pure black).
- No gradients except the YC card background. Flat color everywhere else.
- Semantic colors (green/amber/red/blue) appear ONLY in status indicators, never decoratively.

---

## Responsive Behavior

- **Mobile-first.** All CSS is written for mobile, then enhanced with `@media (min-width: 768px)` for desktop.
- Desktop adjustments are minimal: detail panel centering, slightly more breathing room.
- No breakpoints below 768px — the mobile layout works from 320px up.
- Touch behaviors (`:active` transforms, `-webkit-tap-highlight-color: transparent`) apply everywhere.
- `-webkit-overflow-scrolling: touch` on scrollable panels for iOS momentum.
- `overscroll-behavior: contain` on panels to prevent background scroll bleed.

---

## Anti-Patterns (Design)

- ❌ Raw hex/rgb values instead of CSS custom properties
- ❌ `px` font sizes instead of `--text-*` tokens
- ❌ Custom shadows instead of `--shadow-*` tokens
- ❌ Tap targets smaller than 44×44px
- ❌ Playfair Display used for body text or UI labels
- ❌ Pure black or pure white anywhere
- ❌ Saturated or neon colors
- ❌ Icon fonts or external icon image files
- ❌ `ease-in-out` or `linear` easing (use `--ease-out`)
- ❌ Content wider than `--max-width` without explicit justification
- ❌ Fixed-position elements that don't account for `safe-area-inset-bottom`
