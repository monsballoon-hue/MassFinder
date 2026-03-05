# What MassFinder Could Feel Like

## The app people open every morning

Right now MassFinder answers one question well: "Where can I go to Mass?" That's utility. It's a tool you pull out when you need it and put away. What you're describing is something different — an app people open because they *want to*, because something interesting is always in there. The Catholic community in Western New England, surfaced in one place, alive and current.

Here's what that looks like across a week in someone's life.

---

## Monday morning. Coffee. Open the app.

The home screen isn't a list of churches anymore. It's a **feed** — a living stream of what's happening across your saved parishes and your area, assembled fresh from this week's bulletins. Not social media. Not algorithmic engagement bait. Just: here's what's going on in your Catholic community this week.

**Today's card** sits at the top. It already knows your favorites. It knows you go to St. Mary's and Sacred Heart. It shows:

> *Stations of the Cross tonight at Sacred Heart, 7 PM. Fish Fry at St. Mary's this Friday 5–7 PM. RCIA inquiry session at Blessed Sacrament Wednesday — know someone curious?*

Below that, the **liturgical context** — the feast day, a one-line reflection, today's readings. This is already in the app but currently buried in the More tab. It should be the ambient texture of the home screen. Catholics who pray the liturgy of the hours or follow the daily readings don't need to go hunting for it.

Then the **bulletin highlights** — the interesting stuff extracted from this week's bulletins across all your saved parishes. Not the boilerplate schedule sidebar. The *news*. The pastor's letter about the capital campaign. The announcement that the 9 AM Sunday Mass is moving to 9:30 starting next month. The call for Habitat for Humanity volunteers. The Knights of Columbus trivia night.

This is the meemaw-events-included vision. Every bulletin item, tagged, searchable, subscribable. The fish fry your grandmother would drive 20 minutes for. The blood drive the retired nurse wants to know about. The young adult bonfire that the 28-year-old who just moved to Springfield is trying to find.

---

## The "What's Happening" view

Imagine tapping a dedicated tab — call it **Discover**, or **Happenings**, or even just **This Week** — and seeing every event across all 150 parishes in your region, filterable by:

**Time:** Today, This Week, This Weekend, This Month
**Type:** Social events, Devotional, Educational, Service/Volunteer, Sacramental, Youth, Young Adult, Family, Senior
**Distance:** Within 5 mi, 10 mi, 25 mi, or specific towns/counties
**Parish:** Just my saved churches, or everything

So a user could do:

- *"Show me everything social within 10 miles this weekend"* → Fish fries, trivia nights, pancake breakfasts, parish dances
- *"Volunteer opportunities this month"* → Food drives, Habitat builds, coat collections across 15 parishes
- *"Young adult events in Hampshire County"* → Holy hours, bonfires, theology on tap
- *"What's happening at Sacred Heart this week?"* → The full bulletin extract, organized

Each event card shows the essentials at a glance — what, where, when, which parish — with a tap to expand for details, add to calendar, get directions, or share.

The map tab also comes alive here. Instead of just showing church pins, it could show **event clusters**. Zoom in on Holyoke and see three pins for this weekend: a fish fry, a Lenten mission, and a clothing drive. The map becomes a living picture of community activity, not just building locations.

---

## The parish profile goes deeper

Right now, tapping a parish shows its schedule and contact info. With bulletin data flowing in, the parish detail panel becomes a **full portrait of parish life**:

**This Week's Bulletin** — the extracted highlights, organized by category, with the option to view the original PDF.

**Coming Up** — a rolling calendar of everything happening at this parish in the next 30 days, pulled automatically from parsed bulletins.

**Community Life** — ongoing programs and ministries. Bible studies that meet every Tuesday. The choir that rehearses Thursdays. The food pantry open hours. The bereavement group. This paints a picture of what the parish *feels like* — whether it's active and bustling or quiet and contemplative.

**Pastor's Corner** — extracted highlights from the pastor's weekly letter. For parishioners who love their pastor's writing but miss it when they skip a Sunday. For parish-shopping newcomers who want to get a feel for the community's voice.

**Parish Character Tags** — this is subtle but powerful. Over time, the bulletin data reveals a parish's personality. A parish that consistently has young adult events, contemporary music mentions, and social justice volunteer drives has a different character than one focused on traditional devotions, Latin Mass, and Eucharistic adoration. You don't *label* parishes judgmentally — but you could surface gentle indicators: "Active youth ministry," "Strong devotional life," "Food pantry and outreach." This helps newcomers find the community that fits them.

---

## Subscriptions: the thing nobody has built

This is the feature that has no equivalent in Catholic tech. Period.

A user taps "Subscribe" and chooses what they care about:

- **By parish:** "Notify me of anything new at St. Michael's" — they get a weekly digest of that parish's bulletin highlights.
- **By category:** "I want to know about every fish fry in the region" — every Lent, they get a running list without lifting a finger.
- **By keyword:** "Alert me when any parish mentions 'young adults'" — catches events from parishes they've never heard of.
- **By ministry:** "Show me all Bible studies within 15 miles" — discovers three options they didn't know existed.
- **By series:** "Follow the Lenten mission at Holy Cross" — gets updates on specific multi-week events.

**The weekly digest email** is the killer distribution channel. Not push notifications (those are for time-sensitive stuff). A clean, beautiful Saturday email:

> *Your Week in Catholic Western New England*
>
> **At your saved parishes:**
> St. Mary's: Fish Fry Friday, CCD registration open, 9 AM Mass moving to 9:30 starting March 15
> Sacred Heart: Stations of the Cross Wed & Fri, parish council meeting Thursday
>
> **Matching your interests (Bible studies, volunteering):**
> New Bible study starting at Blessed Sacrament — Tuesdays 7 PM
> Habitat for Humanity build day at Our Lady of the Valley — March 22
>
> **Happening nearby this weekend:**
> 4 fish fries, 2 Stations services, 1 parish trivia night

That email is something people would genuinely look forward to every week. It replaces the experience of reading the bulletin at Mass — except it covers *every* parish in your area, not just the one you attend.

---

## PWA vs. App Store: the honest assessment

### What the PWA gives you today
- Works on every phone, tablet, and computer with a browser
- Add-to-home-screen creates an app-like icon
- Offline capability via service worker
- Zero download friction — share a URL and it works
- Zero App Store review process or fees
- Full control over updates (no waiting for Apple approval)
- You already have this working well

### What a native App Store presence gives you

**Push notifications that actually work.** This is the single biggest capability gap. PWA push notifications are supported on Android but remain unreliable or absent on iOS Safari. A native app (or a hybrid wrapper like Capacitor) gives you rock-solid push notifications on both platforms. For time-sensitive bulletin items — "Mass cancelled due to weather," "Fish fry sold out early, come to St. Joseph's instead," "Eucharistic procession route changed" — push is the right channel.

**Discoverability.** People over 50 search the App Store for Catholic apps. They don't search the web for PWAs. Having "MassFinder" in the App Store with a polished listing, screenshots, and reviews creates legitimacy and findability that a URL can't match. The priests and parish secretaries who recommend the app will say "download it from the App Store" — that's the language their parishioners understand.

**Background refresh.** A native app can silently fetch new bulletin data and update its badge icon. The user sees "3" on the app icon and knows there are three new items since they last opened it. PWAs can't do this on iOS.

**Widgets.** An iOS/Android widget on the home screen showing "Next Mass: 9 AM Sunday, St. Mary's" or "This Weekend: 3 events near you" keeps the app present in daily life without opening it.

**Haptic feedback, native transitions, Siri/Shortcuts integration.** Small things that make the experience feel *right* on the device.

### The recommendation

**Keep the PWA as the primary platform and add a thin native wrapper via Capacitor (or Expo).** This is not "rewrite the app natively." Capacitor wraps your existing web app in a native shell that gives you access to push notifications, background refresh, widgets, and App Store distribution — while sharing 95% of the codebase with the PWA. Your HTML/CSS/JS stays the same. You add a small native layer for the capabilities the PWA can't provide.

**Cost:** Apple Developer Program is $99/year. Google Play is a one-time $25 fee. Capacitor is free and open source.

**Effort:** Wrapping an existing PWA in Capacitor is a weekend project for the basic shell. Push notifications take another week to wire up (you'd use a service like OneSignal's free tier or Firebase Cloud Messaging). Widgets are more involved — maybe a week of focused work each for iOS and Android.

**The hybrid path** means you maintain one codebase, deploy to web *and* App Store, and pick up native capabilities incrementally. You don't have to ship widgets on day one. Start with the wrapper + push notifications, then add polish.

---

## The experiences that would make people tell their friends

Beyond the core bulletin aggregation, here are the features that create word-of-mouth — the things someone would mention to a friend after Mass.

### "I'm visiting — find me a Mass"

The traveler experience. You're driving through Connecticut. You open MassFinder. It shows: *"3 Masses within 15 minutes: St. Patrick's in 45 min (4.2 mi), Our Lady of Mercy in 1 hr 10 min (2.8 mi), Sacred Heart — Spanish — in 2 hrs (6.1 mi)."* One-tap directions. This already works in MassFinder today and it's great. But with bulletin data, you could also show: *"St. Patrick's has coffee and donuts after the 10 AM — newcomers welcome."* That changes a utility lookup into a warm community invitation.

### "What's my church doing that I'm missing?"

Lots of parishioners attend Sunday Mass and nothing else — not because they don't want to, but because they don't know what's available. The bulletin sits in the pew. They might glance at it. They probably miss the thing on page 3. The app surfaces it: *"Did you know Sacred Heart has a Thursday evening Holy Hour? Only 4.2 miles from you."* This isn't a notification — it's gentle discovery, surfaced when the user browses.

### Lent mode / Advent mode / liturgical seasons

The app already has a Lent chip filter. Go much further. During Lent, the entire app shifts. The color palette gets a subtle purple tint. The home feed prioritizes Stations of the Cross services, fish fries, Lenten missions, penance services, and parish retreats. A "Lenten Journey" section curates a path:

> *Week 3 of Lent: Stations of the Cross available at 8 parishes this week. Penance services at 3 parishes before Easter. Have you tried Eucharistic Adoration? 12 parishes offer it near you.*

This isn't liturgical calendar data (you already have that). It's bulletin data *contextualized by season*. The Advent equivalent shows Lessons & Carols, penance services, Christmas Mass schedules, Angel Tree signups, and parish Giving Tree programs.

### The parish comparison view

A user is new to the area, or they're thinking about switching parishes. They want to compare: which churches near me have what I'm looking for? A view that shows 3–4 parishes side by side:

| | St. Mary's | Sacred Heart | Holy Cross |
|---|---|---|---|
| Sunday Masses | 8, 10, 12 | 9, 11 | 7:30, 9:30, 11:30 |
| Confession | Sat 3–4 PM | By appt | Sat 3–3:45 PM |
| Adoration | Tues 9 AM–noon | 24/7 chapel | First Friday |
| Young adult? | Monthly events | None visible | Active YC group |
| Active programs | 8 this week | 3 this week | 12 this week |
| Distance | 2.1 mi | 3.4 mi | 5.8 mi |

Nobody offers this. It's genuinely useful for someone trying to decide where to plant roots.

### "Add to my calendar" that just works

Every bulletin item and every service time should be exportable as an iCal event with one tap. But better: **subscribe to a live calendar feed.** A user subscribes to "All events at St. Mary's" and gets a calendar URL they add to Apple Calendar or Google Calendar once. Every week, as new bulletin items are parsed, they automatically appear on their phone's calendar. No app needed. No email needed. Just... there.

This is technically an iCal feed endpoint (`/api/ical/parish/parish_001` or `/api/ical/subscription/{token}`) that Supabase + Vercel can serve. Calendar apps poll it periodically. It's the most frictionless notification channel that exists for the over-50 demographic — their calendar just shows the events.

### The "I'm interested" signal

On every event card, a simple heart or hand-raise button: "I'm interested." This does two things:

1. **For the user:** Adds the event to their personal agenda view and (optionally) their calendar.
2. **For you (the operator):** Creates anonymous aggregate interest signals. If 40 people tap "interested" on the St. Mary's fish fry and 3 people tap it on the Holy Cross book club, you know which content resonates. Over time, this data helps you prioritize which bulletins to parse first, which event types to surface more prominently, and what the community actually cares about.

You already have a version of this ("expressInterest") in the code — it submits via Web3Forms. With a database, this becomes much richer.

### Smart notifications (native app)

Not spam. Not every bulletin item as a push. Curated, respectful, useful:

- **Schedule change alerts:** "⛪ Heads up: St. Mary's 9 AM Sunday Mass is moving to 9:30 starting March 15." Only sent to people who have St. Mary's saved and attend the 9 AM. This is the notification that prevents someone from showing up to an empty church.

- **Weather cancellations:** "❄️ Sacred Heart has cancelled all services tonight due to the winter storm." Urgent, rare, valuable.

- **Your subscriptions:** "🐟 3 fish fries near you this Friday." Sent once per week on Thursday afternoon, matching your subscription preferences.

- **Seasonal nudges:** "🌿 First Sunday of Lent this weekend. 6 Stations of the Cross services and 4 penance services near you." Sent once at the start of a liturgical season, not weekly.

The key principle: **notifications should feel like a thoughtful friend reminding you, not a marketing platform demanding attention.** Default to digest email. Push only for time-sensitive items or explicit opt-ins. Never more than 2–3 pushes per week at the absolute maximum.

### Offline-first bulletin reading

The over-50 demographic sometimes has spotty cellular coverage, especially in rural Vermont and New Hampshire parishes. The app should cache the latest bulletin content aggressively so someone can read their parish's bulletin items in a dead zone at the church parking lot. The service worker already handles this for the schedule data — extend it to bulletin items.

### Share a specific event

Long-press (or tap a share icon) on any event card and get a clean share card:

> **Fish Fry — St. Mary's Parish**
> Friday, March 14 · 5–7 PM · Parish Hall
> $12 adults, $6 kids · Baked & fried options
> 📍 St. Mary's, Westfield MA
> massfinder.app/event/1234

This generates a link that opens directly to that event in the app (or web). Someone can text this to their spouse, post it in a Facebook group, or email it to a friend. Each event has a permanent, shareable URL. This is how individual parishioners become the distribution channel — they share the fish fry link in their family group chat and suddenly 10 people have MassFinder on their phones.

### Accessibility beyond age

The Apple design system is great. Go further for the core demographic:

- **Dynamic type support** that actually works — someone with their iPhone set to "Extra Large" text should see the app scale gracefully, not break.
- **High contrast mode** — already partially there with the navy/white/gold palette, but worth testing with actual accessibility tools.
- **Voice control compatibility** — iOS Voice Control and Android Voice Access let people navigate by speaking. All interactive elements need proper aria labels (you've already been good about this).
- **Reduce motion** — respect `prefers-reduced-motion` for anyone with vestibular sensitivities. Disable card animations, smooth scrolling transitions.
- **Print view** — the 75-year-old who wants to print this week's events and stick it on the fridge. A clean print stylesheet that renders the "This Week" view as a single-page summary. Sounds trivial, is genuinely useful for the demographic.

---

## The tab structure, reimagined

Currently: **Find | Map | Saved | More**

The bulletin vision suggests a different information architecture:

### Option A: Add a "Happenings" tab
**Find | Happenings | Map | Saved | More**

Five tabs is the iOS maximum before it feels crowded. "Happenings" becomes the bulletin-powered event discovery view. "Find" stays focused on Mass/service lookup. Clean separation.

### Option B: Evolve the home tab
**Home | Find | Map | Saved | More**

"Home" is the personalized feed — your parishes' bulletin highlights, your subscriptions, today's liturgical content, and smart suggestions. "Find" becomes purely the search/filter tool for services. This makes the app feel personal on launch rather than utilitarian.

### Option C: Merge Saved into Home
**Home | Find | Map | More**

Your saved parishes drive the Home feed. Tap into any parish from the feed to see its full detail. "Saved" as a separate tab disappears because it's the backbone of Home. This is the boldest — it changes the app's identity from "find a Mass" to "my Catholic community."

My instinct says **Option B** is the sweet spot. Home makes the app feel warm and personal on open. Find stays the powerful search tool. Map is Map. Saved is your list. More holds the extras. Five tabs, each with a clear purpose, none redundant.

---

## The long horizon: things that become possible

Once you have structured bulletin data flowing weekly from 150 parishes, a world of possibilities opens:

**Natural language search.** "Where can I go to confession this Saturday afternoon?" — not filter chips, just type the question. An LLM interprets the query against your structured data and returns results. This is genuinely feasible with a Claude API call against your database. The 65-year-old who doesn't understand filter UIs just types what they want.

**Trend detection.** "Fish fry mentions are up 300% this week" — because it's Lent. "Three parishes have added Saturday evening confession hours" — a quiet trend you'd never notice reading bulletins one at a time. "Volunteer event frequency has doubled since September" — stewardship season. This is operator-level insight, not necessarily user-facing, but valuable for understanding the community.

**Cross-parish coordination visibility.** Two parishes 5 miles apart both scheduled their penance services for the same Tuesday evening. Neither knows. The app surfaces this — not as a conflict, but as an observation: "Looking for Lenten penance? Two options Tuesday: St. Mary's 6 PM, Sacred Heart 7 PM." The user benefits from the choice. Over time, pastors might even use this data to coordinate complementary scheduling.

**Event flyer hosting.** Many bulletin items reference a flyer that's hard to find. The parsing pipeline could extract flyer images from the bulletin PDF and attach them to the corresponding event. "See the full flyer" shows the actual graphic — the one designed by the parish volunteer that has all the details.

**Anonymous engagement analytics for parishes.** If parishes opt in, you could share: "Your fish fry listing was viewed 340 times and 47 people tapped 'interested.' Your Bible study listing was viewed 22 times." Parishes have almost zero visibility into whether their bulletin content reaches people beyond the pews. This would be genuinely novel information for parish staff — and a reason for them to actively support MassFinder.

**Community memory.** After a year of parsed bulletins, you have a searchable archive. "When was the last time Sacred Heart did a parish mission?" Search the archives. "What did St. Mary's used to do for their patronal feast?" It's in the 2025 bulletin. This becomes a quiet historical record of parish community life.

---

## What I'd build first, from a UX perspective

If I were sequencing this purely by user impact (not technical complexity):

1. **The weekly bulletin digest email** — even before the app changes at all. Parse 10 parishes, generate a beautiful email, and send it to 50 people. If they love it, everything else follows.

2. **Bulletin highlights inside parish detail panels** — when you tap a parish, you see this week's extracted bulletin items below the schedule. Minimal UI change, maximum value.

3. **The "Home" feed tab** — personalized view of your parishes' activity. This transforms the app's daily utility.

4. **Cross-parish event search** — "show me fish fries within 20 miles." The thing that no one else offers.

5. **Calendar feed subscriptions** — iCal URLs that populate the user's phone calendar automatically.

6. **Native wrapper + push notifications** — the App Store presence and the alert capability for schedule changes.

7. **The share cards** — making every event shareable as a clean link with preview.

8. **Natural language search** — the "just ask" experience.

Each one is independently shippable and valuable. Each one makes the next one more compelling.

---

## The name question

"MassFinder" is perfect for a Mass time lookup tool. If the app evolves into a full community bulletin platform, the name might feel limiting. You don't have to rename — it's got equity now — but it's worth thinking about whether the brand grows with the product.

Possibilities that preserve the spirit:
- **MassFinder** (keep it — people know it, and Mass is still the center)
- **My Parish** (warm, personal — but myParish App already exists from Diocesan)
- **The Bulletin** (direct, unpretentious, exactly what it is)
- **Parish Life** (broader, encompasses everything)
- **Your original instinct: MyCatholicBulletin** (clear, descriptive, zero ambiguity)

Or keep MassFinder and let the tagline evolve: *MassFinder — Your Catholic community in Western New England.*

---

## The thing that makes all of this work

None of these features matter if the data isn't fresh and accurate. That's always been your superpower — the manual verification, the obsessive data quality, the parish-by-parish checking. The bulletin parsing pipeline automates the *extraction*, but your editorial eye is what makes the *product* trustworthy.

The vision isn't "AI replaces the human." It's "AI reads 150 bulletins in 10 minutes so the human can spend their time on what matters — deciding what's important, catching errors, and making the experience great."

You read the bulletin at Mass every Sunday. You already do this. The app just lets you do it for 150 parishes instead of one.
