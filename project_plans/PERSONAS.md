# MassFinder User Personas & UX Framework

> Every UX decision must work for ALL three personas simultaneously.
> When in conflict, bias toward the least technical user.

---

## The Three Personas

### 1. Grandparent Generation (50+, primary audience)

**Profile:** Regular Mass-goers, parish-connected, limited tech comfort. May have received link from a grandson or parish bulletin. Likely on an older iPhone or iPad.

**Behaviors:**
- Reads email digests, doesn't "use apps"
- Won't install anything unless told it's easy
- Taps with index finger, needs generous tap targets
- Reads every word on screen — can't scan/skim like younger users
- Distrusts anything that looks complicated
- Will abandon if confused within 5 seconds

**Design implications:**
- No onboarding wizard, no sign-up, no tutorial
- Large tap targets (44px+ is minimum, 48px+ preferred for primary actions)
- Clear, readable text at default size (17px base)
- No jargon: "Find" not "Discover", "Saved" not "Bookmarks"
- Progressive disclosure: show the essential, hide the rest behind taps
- The PWA install prompt must be dismissible and non-intrusive
- Print-friendly: some will want to print Mass times (future consideration)

### 2. Millennials (30–45, secondary audience)

**Profile:** Attend Mass semi-regularly or are returning to the faith. Appreciate utility without feeling enslaved to it. Use phones competently but aren't enthusiasts.

**Behaviors:**
- Will bookmark a website, might install a PWA if prompted simply
- Values speed: open, find, go
- Comfortable with filters and sorting but won't read help docs
- Will try the "Saved" tab to track their parish
- Interested in events if surfaced naturally

**Design implications:**
- Quick paths to information: search → result → detail in <3 taps
- Sorting by distance/next service must work instantly
- Event discovery should feel organic (YC cards mixed into the feed, community events in parish detail)
- Don't gate anything behind interactions they haven't initiated

### 3. Gen Z / Young Catholic (18–30, growing segment)

**Profile:** Active Catholics involved in Young & Catholic events, parish social groups, possibly considering religious life. Phone-native. Expects app-quality experience.

**Behaviors:**
- Will install the PWA immediately
- Expects add-to-calendar (iCal), share functionality
- Wants event details: what, when, who's going, social links
- Will scroll through a feed, expects animations and polish
- Instagram/TikTok has set their bar for visual quality

**Design implications:**
- The YC event cards and event detail panel are their primary touchpoint
- Calendar export (iCal) must work flawlessly on iOS
- Animations and micro-interactions signal quality to this group
- The gold accent branding on YC content resonates here
- Social links (Instagram handles) should be tappable
- The "Saved" tab should feel like a personalized dashboard

---

## Universal UX Principles (Apple HIG)

These apply regardless of persona:

### 1. Progressive Disclosure
Show the minimum needed at each level. Parish cards show name + town + next service. Tap for full detail. Detail panel shows schedule sections collapsed. Tap to expand.

### 2. One Task Per View
- Find tab: search and browse parishes
- Map tab: visual discovery
- Saved tab: personal dashboard
- More tab: resources and settings
- Detail panel: everything about one parish
- Event panel: everything about one event

Never combine tasks. Never show two parishes' details simultaneously.

### 3. Direct Manipulation
- Tap a card → open detail (not "click here for more info")
- Tap a chip → filter activates (instant, not a form submission)
- Heart icon → favorite toggled (no confirmation dialog)
- Pull to refresh → data updates (planned)

### 4. Consistency
- Same card style everywhere a parish appears (Find, Map popup, Saved)
- Same detail panel for all parishes
- Same event panel for all events
- Same accordion pattern for all collapsible sections
- Same badge styling across all contexts

### 5. Feedback
- Chip tap: `scale(0.97)` press effect
- Card tap: `scale(0.995)` press effect
- Favorite: heart fills/unfills immediately
- Toast messages for async confirmations
- Pulse dot on "Happening Soon" / "In Progress" badges

---

## Decision Framework for New Features

When evaluating any new feature, ask in order:

1. **Does it serve the grandparent?** If they'd find it confusing, it needs progressive disclosure or should be hidden behind the More tab.
2. **Does it add value or noise?** Every element on screen competes for attention. If it doesn't help someone find or attend Mass, events, or services, justify its presence.
3. **Can it be zero-config?** No settings to configure, no accounts to create, no preferences to set before it works.
4. **Does it follow existing patterns?** A new card type should look like a card. A new panel should slide up from the bottom. A new filter should be a chip.
5. **Is it one tap away?** Information the user actively seeks should be ≤3 taps from the home state. ≤2 is better.

---

## Content Voice

- **Clear, not clever.** "Next Mass" not "Your Next Service Opportunity."
- **Catholic, not generic.** "Mass" not "Service." "Confession" not "Counseling."
- **Warm, not corporate.** The app is a parish tool, not a tech product.
- **Brief, not verbose.** Labels are 1–3 words. Descriptions are 1 sentence.
- **Respectful of intelligence.** Don't over-explain. Parishioners know what Adoration is.

---

## Anti-Patterns (UX)

- ❌ Modals or popups that interrupt without user action
- ❌ "Sign up" or "Create account" flows
- ❌ Tooltips (users don't hover on mobile)
- ❌ Hamburger menus (tab bar is the navigation)
- ❌ Infinite scroll without context (cards have a finite, countable list)
- ❌ Auto-playing media
- ❌ Notification permission requests on first visit
- ❌ Feature announcements that block interaction ("What's New" modals)
- ❌ Placeholder content / skeleton screens for data that loads in <500ms
- ❌ Social login buttons
- ❌ Star ratings or reviews
- ❌ User-generated content (comments, posts)
