# MassFinder V2 — Build Plan

**The plan to take MassFinder from a Mass-time finder to a living Catholic community bulletin board for Western New England, built and maintained by one person for under $50/month.**

---

## What V2 is and what it isn't

V2 takes the app you have today — a polished, well-received Mass and service finder — and adds one transformative capability: **every week, the app reads every parish bulletin in its coverage area and turns the contents into searchable, browsable, subscribable information.** That's the core. Everything else in this plan flows from it.

V2 **is:**
- A bulletin-powered event discovery platform
- A weekly email digest people look forward to receiving
- A place where the community can signal interest and share practical tips on events
- A contributor-friendly system where trusted volunteers help verify data
- Fundable by small voluntary donations from the community it serves

V2 **is not:**
- A social network (no comments, no public profiles, no posting)
- An App Store app (that's V3, once V2 is proven and stable)
- An SMS subscription system (email is the better channel for this audience and this budget)
- A business

---

## What it costs to run

| What | Service | Monthly |
|------|---------|---------|
| Database and file storage | Supabase (free tier) | $0 |
| Hosting and web server functions | Vercel (free tier, already in use) | $0 |
| Bulletin reading by AI | Anthropic API (Claude Sonnet vision) | $12–25 |
| Weekly email digests | Resend (free tier, up to 3,000/month) | $0 |
| Domain name | Already owned | ~$1 |
| Donation page | Ko-fi (0% platform fee) | $0 |
| **Total** | | **$13–26/month** |

If you grow beyond 200 email subscribers, Resend's paid tier is $20/month for 50,000 emails. If you push past 500MB of database storage (unlikely with 150 parishes), Supabase Pro is $25/month. The ceiling even at full tilt is well under $50/month.

---

## How each current feature evolves

### The Find tab (searching for churches and services)

**Today:** You see a list of parish cards with the next service time, filter by chips (Today, Weekend, Confession, Adoration, etc.), search by name or town, and sort by name, distance, or next service. Data comes from a static file.

**V2:** Looks and feels identical on the surface. Same cards, same chips, same search, same sorting. The change is underneath — data now comes from a database instead of a static file. This means:

- Search becomes **much more powerful** because the database supports full-text search. You could type "fish fry Westfield" and find a match even though "fish fry" isn't in the parish name — it's in the bulletin data.
- A new **"Events" chip** joins the filter bar. Tap it and the card list transforms to show upcoming events across all parishes rather than parish cards. Filter further by type (Social, Devotional, Educational, Volunteer, etc.).
- The existing "More Filters" overlay gets an **event category section**: Social Events, Devotions, Education, Volunteering, Youth, Senior, Family. These map directly to the bulletin parsing categories.

**What the user notices:** Search finds more things. A new filter chip appears. Everything else feels the same.

**What changed technically:** The two lines in the startup code that fetch `parish_data.json` and `events.json` now point to server functions (`/api/parishes` and `/api/events`) that pull from the database. These server functions return data in the exact same shape as the old files, so none of the existing display logic needs to change. The static files stay as a backup — if the database is ever unreachable, the service worker serves the cached versions.

---

### The Map tab

**Today:** Leaflet map with custom cross-pin markers for each parish. Tap a pin to see the parish name and next service. Marker clustering at zoom-out levels.

**V2:** Same map, same markers, but with a new overlay toggle: **"Show Events."** When toggled on, event pins appear alongside church pins — colored differently (gold for events, navy for churches). Each event pin shows the event title, date/time, and which parish it belongs to. Tap to open the event detail.

During Lent, the map lights up with fish fry pins across the region. During Advent, penance services appear. The map goes from "where are the churches" to "where is the action this week."

**What the user notices:** A toggle button in the map header. When on, colorful pins show events. When off, it's the same church map as before.

**What changed technically:** The map initialization code gets a second data layer for events. Pins are created from the events database query filtered to current/upcoming items. The toggle shows/hides this layer. ~50 lines of new code in the map section.

---

### The Saved tab

**Today:** Shows your favorited churches with "This Week at Your Churches" (upcoming events), YC events at your churches, and the church cards with next-service info.

**V2:** Becomes your **personal hub.** Three sections:

1. **This Week** — everything happening at your saved parishes this week, pulled from freshly parsed bulletins. Not just the events you manually entered in `events.json` — everything the AI found in the bulletin. The fish fry. The Bible study. The choir rehearsal schedule change. The Knights of Columbus meeting. This section replaces the current limited event view with a rich, automatically updated stream.

2. **Your Churches** — the existing card list of favorited parishes, now with a badge showing how many new bulletin items appeared this week. "St. Mary's (4 new)" tells you the bulletin had four interesting things extracted.

3. **Your Interests** — a new section, visible only if you've subscribed to categories. If you said "show me all fish fries in the region," this is where they appear. If you follow "volunteering within 15 miles," those opportunities show up here. This is the subscription engine made visible.

**What the user notices:** The Saved tab feels alive. Every week there's new content from their parishes without anyone manually entering it.

**What changed technically:** The Saved tab rendering function queries the `bulletin_items` table filtered by the user's saved parish IDs and the current week. The "Your Interests" section queries against saved subscription preferences (stored in the browser's local storage or, optionally, in the database if the user provided an email). The existing card rendering patterns are reused — just fed with richer data.

---

### The More tab

**Today:** Contains "What's Happening" (YC + Community events), Saint of the Day, Daily Readings, Liturgical Calendar, Devotional Guides, Feedback Form, About section, and the correction/report form.

**V2:** Reorganized into a cleaner layout with two new sections:

1. **Discover** (replaces "What's Happening") — a scrollable, filterable view of everything happening across all 150 parishes this week. Think of it as a regional Catholic events calendar. Cards show event title, parish name, date/time, category badge, and distance. Tap to expand. Filter by category, distance, or date.

2. **Subscribe** — a new section where the user enters their email and picks what they care about:
   - "Everything from my saved parishes" (default on)
   - Categories: Social Events, Devotions, Education, Volunteering, Youth, Family
   - "Events within __ miles" (5/10/25)
   - Frequency: Weekly digest (default) or bi-weekly
   
   One email field. A few taps on preference buttons. No account, no password, no app to install. They get a weekly email every Saturday evening with their curated bulletin highlights.

3. **Support MassFinder** — a simple, warm card (not a popup, not a banner, not a nag):
   > "MassFinder is a free community project. If it's been helpful, consider supporting it — even a couple dollars helps cover hosting costs. 🙏"
   
   Links to the Ko-fi page. Only appears after the user has used the app at least 3 times. Dismissible. Comes back once per season (every ~90 days). Preset amounts: $2, $5, $10.

Everything else stays: Saint of the Day, Readings, Liturgical Calendar, Devotional Guides, Feedback, About, Corrections. These move below the new sections.

**What the user notices:** The More tab feels like a magazine — a curated view of what's happening in Catholic Western New England this week. The subscribe option feels effortless.

---

### Parish detail panels

**Today:** Tap a church card and a slide-up panel shows the full schedule organized by day, language badges, verified checkmark, clergy, contact info, website link, Google Maps link, and a correction form. Community events appear at the bottom when available.

**V2:** The same panel, same layout, but with a new section inserted between the schedule and the contact info:

**"This Week's Bulletin"** — a clean list of items extracted from the most recent bulletin. Each item shows:
- Category icon (calendar for events, megaphone for announcements, alert for schedule changes)
- Title
- Date/time if applicable
- Brief description
- An "Add to Calendar" button for dated items
- A heart icon for "I'm interested" (shows anonymous count: "12 interested")

Below each event card, a row of **tip tags** that other users have left:
> 🅿️ Parking limited · 🕐 Arrive early · 👨‍👩‍👧 Family-friendly

These tags are pre-defined (not free text). A user taps "Add a tip" and sees a menu of options to select from. No typing, no moderation needed, no risk of someone posting something inappropriate. Just structured, helpful community knowledge.

**What the user notices:** When they tap their parish, they see everything that was in this week's bulletin — without having to find and read the PDF. Schedule changes are flagged prominently at the top in a gold alert card.

---

### The admin panel (admin.html)

**Today:** A password-protected editor for parish_data.json. Sidebar with all parishes, main area with form fields for editing services, contact info, validation status. Download the full JSON when done.

**V2:** Same panel, but now it writes to the database instead of downloading a JSON file. Two new sections:

1. **Bulletin Review Queue** — the heart of the weekly workflow. Shows parsed bulletin items awaiting your approval. Each item displays the original bulletin page image on the left and the extracted data on the right. Actions per item:
   - ✅ **Approve** — publishes to the app
   - ✏️ **Edit** — fix a time, category, or description before publishing
   - ❌ **Discard** — junk extraction, ad content, duplicate
   - 🔄 **Unchanged** — same as last week, auto-approve

   Items are grouped by parish and sorted by confidence score (highest confidence first, so you can batch-approve the obvious ones quickly). A progress bar shows "47 of 52 reviewed" to make the weekly task feel completable.

2. **Contributor Dashboard** — where you manage trusted volunteers who help verify data (more on this below).

**What you notice as the operator:** Instead of manually reading bulletins and typing events into a JSON file, you review what the AI extracted and tap approve or edit. Your weekly data maintenance drops from "read every bulletin and manually enter events" to "scan the pre-filled review queue and fix the few things the AI got wrong."

---

## The bulletin parsing pipeline — how bulletins become data

This is the new engine that powers everything. Here's what happens each week:

### Saturday morning (fully automatic, no human involvement)

**Step 1: Fetch the bulletins.**
A scheduled task runs at 6 AM every Saturday. It goes through each of the 150 parishes and downloads that week's bulletin PDF from the known URL. Most bulletins come from LPi (the publisher) and follow a predictable web address pattern — the task just fills in the current date. For parishes with non-standard bulletin URLs, the address is stored in the database.

About 88 of your 93 current parishes already have bulletin URLs recorded. The remaining parishes either don't publish digital bulletins (the task skips them) or use URLs you'll add as you discover them.

If a bulletin can't be downloaded (site is down, URL changed, etc.), it gets flagged for you to investigate later. No bulletin, no problem — the parish just shows last week's data with a note that this week's bulletin wasn't available.

**Step 2: Convert each page to a picture.**
Bulletin PDFs get converted to images — one image per page, at a resolution clear enough for both the AI to read and for you to view in the review dashboard. A typical 4-page bulletin produces 4 images, each about 500KB.

This is the key move that sidesteps the copy-paste formatting disaster you've experienced. Instead of trying to extract text from the PDF (which produces scrambled garbage for multi-column layouts), we just take a picture of each page and let the AI read the picture the same way you would read the printed page.

**Step 3: The AI reads each page.**
Each page image is sent to Claude's vision capability through the API. The AI receives the image along with a detailed instruction set that tells it:

- What to look for: events, announcements, schedule changes, ministry sign-ups, volunteer opportunities, social events, devotional activities, sacramental preparations
- What to ignore: paid advertisements, boilerplate weekly schedule (if unchanged), publisher branding, copyright notices
- How to format the output: structured data with category, title, description, date, time, location, contact info, and a confidence score
- Context about this specific parish: its name, town, known recurring events, typical bulletin layout

The AI returns structured data for each item it finds. A typical 4-page bulletin yields 5–15 extractable items.

**Step 4: Store and prepare for review.**
The extracted items get saved to the database with a "pending review" status. A comparison runs against last week's data to flag what's **new or changed** — so when you sit down to review, you're only looking at differences, not re-approving the same fish fry announcement for the 8th week in a row.

### Saturday afternoon (you, ~1–2 hours)

You open the Bulletin Review Queue in the admin panel. You see something like:

> **St. Mary's, Westfield** — 6 items extracted, 2 new, 4 unchanged
> **Sacred Heart, Springfield** — 8 items extracted, 3 new, 5 unchanged
> **Blessed Sacrament, Holyoke** — 4 items extracted, 1 new, 3 unchanged
> *... 47 more parishes ...*

You tap "Auto-approve unchanged" — that handles the 120+ items that are the same as last week in one click.

For the 30–50 new or changed items, you scan each one. Most are correct — approve. A few have a wrong time or miscategorized event — quick edit, approve. Occasionally the AI extracted an advertisement as an event — discard. The whole process should take 60–90 minutes once you're in the groove, and less as the system learns your parishes' bulletin patterns.

### Sunday morning (automatic)

Approved items go live. The app's data refreshes. The weekly email digests compile and send to subscribers. Someone opens MassFinder at coffee after Mass and sees this week's events across all their saved parishes — fresh and accurate.

### How accurate is this, really?

The vision-based approach gets **90–95% accuracy out of the box** on well-formatted LPi and Diocesan bulletins. For the handful of parishes with unusual or hand-formatted bulletins, accuracy might start at 80% but improves quickly as you build up "parish profiles" — notes the AI receives about that parish's specific bulletin quirks.

The items you'll most often need to correct:
- Dates that are ambiguous ("next Saturday" without specifying which Saturday)
- Events that span multiple pages (the AI might extract them twice)
- Bulletin items that are partly promotional and partly informational
- Hand-drawn or highly decorative flyer images where text is stylized

The items the AI consistently nails:
- Event titles and descriptions
- Times (almost always correct from vision)
- Category classification
- Contact information
- Location names

Over time, the accuracy climbs toward 97–98% as the parish profiles accumulate corrections and patterns. Your review time drops correspondingly.

---

## The contributor system — sharing the load

Once the app is running and people are using it, some parishioners will want to help. The contributor system gives trusted volunteers the ability to assist with data verification without giving them the keys to the kingdom.

### How it works

**You invite contributors by email.** Each contributor gets a unique link that logs them in with just their email (no password — they click a link in a confirmation email). They see a simplified version of the admin panel — not the full parish editor, just the parts you've opened to them.

### Three contributor roles

**Bulletin Spotter** — the lightest role. This person attends a specific parish and can flag when the bulletin data looks wrong. They see their parish's extracted bulletin items for this week and can:
- ✅ Confirm "this looks right"
- 🚩 Flag "this is wrong" with a note explaining what's off
- 📝 Submit a correction (time change, new event, cancellation)

They cannot directly edit published data. Their flags and corrections go into your review queue where you approve or dismiss them.

This is ideal for the engaged parishioner who reads the bulletin carefully every week anyway. They're essentially crowdsourcing your verification step — a Bulletin Spotter at each of your top 20 parishes could cut your review time in half.

**Data Verifier** — a mid-level role. This person can verify parish schedule data against the parish website or printed bulletin. They see a dashboard showing parishes due for verification (based on how long since the last check). They can:
- Everything a Bulletin Spotter can do
- Mark a parish as "verified this week" (confirming the stored schedule matches reality)
- Suggest additions (new service, new event) that go into your approval queue

This is the role for the retired parishioner who enjoys being helpful and has time to visit a few parish websites each week.

**Trusted Editor** — the highest volunteer role. This person can directly publish changes to parish data. They have full access to the parish editor for their assigned parishes. Changes they make go live immediately (no approval queue).

Reserve this for 1–2 people you know and trust deeply. Maybe a fellow parishioner who's technically comfortable, or a parish secretary who wants to keep their own listing current.

### The contributor experience

A contributor visits a URL (like `massfinder.app/contribute`). They enter their email. They get a login link. They land on a clean, simple dashboard:

> **Welcome, Margaret**
> You're a Bulletin Spotter for St. Mary's, Westfield
>
> **This Week's Bulletin Items (6 items)**
> [list of extracted items with Confirm/Flag buttons]
>
> **Your Activity**
> 12 items confirmed · 2 items flagged · Last active 3 days ago

No clutter. One job. Big buttons. Works great on a phone.

### Contributor management

In your admin panel, a "Contributors" section shows:
- Who has access, at what role, for which parishes
- Activity log (who confirmed what, who flagged what)
- Invite new contributor (enter email, select role and parish)
- Revoke access

This is database-backed authentication through Supabase's built-in auth system, which handles the email login links, session management, and role-based permissions. You don't have to build any of that from scratch.

---

## The email digest — the feature people will talk about

### What subscribers receive

A clean, well-designed email that arrives every Saturday evening. It's organized into three sections:

**1. "At Your Parish This Week"**
The subscriber's home parish (or parishes, if they saved multiple). Shows 3–5 of the most notable bulletin items:
> **Fish Fry — This Friday 5–7 PM**
> Parish Hall · $12 adults, $6 kids · Baked & fried options available
>
> **⚠️ Mass Time Change: 9 AM → 9:30 AM starting March 15**
>
> **Lenten Bible Study continues — Wednesday 7 PM, Room 204**
> This week: The Gospel of Mark, Chapter 8

Each item has a "View in App" link and an "Add to Calendar" link.

**2. "Picked For You"**
Based on their interest selections (if they chose any): 2–3 events from other parishes that match. If they said they care about volunteering, this section shows the Habitat build at St. Joseph's and the clothing drive at Sacred Heart.

**3. "More This Week"**
A compact list of 5–8 additional events across the region, with a "See all events" link to the app.

### How subscribers sign up

Three paths, all leading to the same subscription:

1. **In the app:** The Subscribe section in the More tab. Enter email, pick interests, done.
2. **On a paper sign-up card:** You print small cards that say "Get weekly Catholic event updates — visit massfinder.app/subscribe" with a QR code. Leave them in church vestibules.
3. **From the parish website:** Any parish that links to MassFinder gives their parishioners a path to subscribe.

No app download required. No account. No password. Just an email address and a couple of taps to pick interests. Unsubscribe in one click from any email.

### How the digest gets built and sent

Saturday evening, a scheduled task runs:
1. Gather all approved bulletin items for the week
2. For each subscriber, assemble their personalized content:
   - Items from their saved parishes
   - Items matching their category interests
   - Items within their distance preference
3. Render the email using a template
4. Send via Resend's API

At 150 parishes and even 500 subscribers, this is well within Resend's free tier (3,000 emails/month → ~750 emails/week capacity).

---

## The donation system

### Ko-fi as the platform

Ko-fi takes zero platform fees on donations — you only pay the Stripe/PayPal processing fee (~3%). Supporters don't need to create an account. Both one-time and recurring donations are supported.

### How it appears in the app

**In the More tab:** A warm, unobtrusive card in the "About MassFinder" section:

> **Support This Ministry**
> MassFinder is free and always will be. It costs about $30/month to keep running. If it's been helpful to you, prayerfully consider chipping in.
>
> [☕ Buy me a coffee — $3] [Support on Ko-fi →]

**In the weekly email:** A single line at the bottom, below the content:
> *MassFinder is a free community project. [Support it here.]*

**Behavioral rules:**
- Never show on first visit
- Never interrupt the user's flow with a popup
- Show the in-app card only after 3+ app opens
- Dismissible for 90 days
- Seasonal emphasis during Advent and Lent ("As we prepare for [season], consider supporting the tools that serve our community")

### What to aim for

If 1 in 20 email subscribers donates $5/month, that's $12.50/month at 50 subscribers, or $125/month at 500 subscribers. Even conservative numbers cover infrastructure costs. A single Catholic foundation micro-grant of $500–$2,000 would fund a full year of operation.

Worth pursuing: **Catholic United Financial Foundation** (grants up to $500 for Catholic tech), the **Koch Foundation** (funds digital evangelization, applications January–May), and your local diocesan innovation fund. Frame the application as "digital evangelization tool serving [X] parishes across [Y] dioceses."

---

## The passive community features

These are the only interaction features in V2. They require no moderation, no user accounts, and add genuine value.

### "Interested" counts

Every event card has a small heart icon. Tap it, the count increments. That's it. No login, no account. Stored as a simple anonymous counter in the database (one count per device per event, tracked via a random token in local storage to prevent double-counting).

The count shows as: "12 people interested" — providing social proof that an event is worth attending, without revealing who's going.

The Saved tab uses these counts for a subtle sort: events with more interest bubble slightly higher in the feed.

### Experiential tip tags

On event detail views, users can add structured tips from a predefined list:

🅿️ Parking limited
🕐 Arrive early
🍽️ Bring a dish to share
👨‍👩‍👧 Family friendly
♿ Wheelchair accessible
🔇 Quiet/contemplative
🎵 Live music
📱 Livestream available
❄️ Dress warm (outdoor)
💵 Cash only
🆓 Free admission

Tap "Add a tip" → see the list → tap one or more → done. Tips show as small tag pills below the event description. A tip needs 2+ independent submissions to appear (preventing a single person from filling an event with misleading tags).

No free text. No moderation. No risk. Just structured community knowledge.

---

## The complete build sequence

### Batch 1: The foundation (Weeks 1–2)

**What you're building:** The database that replaces the static JSON files, and the server functions that serve data to the existing app.

**Step by step:**
1. Create a Supabase project (free, takes 5 minutes)
2. Set up the database tables for parishes, services, events, bulletins, and subscriptions
3. Write a migration script that reads your current `parish_data.json` and `events.json` and loads all that data into the new database
4. Create two server functions on Vercel:
   - One that serves parish data in the same format the app already expects
   - One that serves events in the same format
5. Update two lines in `index.html` — the fetch calls that load data — to point to the new server functions instead of the static files
6. Keep the static files as offline fallback
7. Test everything: the app should work identically to today

**What changes for users:** Nothing visible. The app looks and works exactly the same. But underneath, you've switched from a flat file to a real database.

**Verify before moving on:** Load the app in desktop Chrome incognito. Everything works. Open it on your phone. Everything works. Check the Saved tab, the Map, the detail panels. If it all behaves identically to today, Batch 1 is done.

### Batch 2: The bulletin pipeline (Weeks 3–5)

**What you're building:** The system that reads bulletin PDFs and extracts structured data.

**Step by step:**
1. Add your Anthropic API key to the project's environment variables
2. Build the parsing script — the code that takes a bulletin URL, downloads the PDF, converts each page to an image, sends it to Claude's vision API, and stores the results in the database
3. Add the `bulletins` and `bulletin_items` tables to the database
4. Run the parser manually on 10 pilot parishes — pick ones with clean LPi bulletins first
5. Review the results by looking at the raw data in Supabase's dashboard (the review UI comes later)
6. Measure accuracy: for each parish, compare what the AI extracted against what you see in the actual bulletin
7. Refine the instruction prompt based on what the AI gets wrong
8. Expand to 20 parishes, then 50, then all available

**What changes for users:** Still nothing visible yet. You're building and testing the engine in the background.

**Verify before moving on:** You can run the parser on any parish and get 90%+ accurate results. The data shows up correctly in the database. You've processed at least 30 parishes successfully.

### Batch 3: Bulletin content in the app (Weeks 6–7)

**What you're building:** The user-facing bulletin content — showing extracted items in parish detail panels and creating the event discovery view.

**Step by step:**
1. Add a "This Week's Bulletin" section to the parish detail panel, below the existing schedule
2. Create a server function that returns bulletin items for a given parish and week
3. Style the bulletin item cards to match the existing design language (same fonts, colors, spacing, card shadows)
4. Add the event discovery view — either as an "Events" chip on the Find tab or as the "Discover" section in the More tab
5. Build the event detail view — tap an event to see full description, location, parish name, "Add to Calendar" button, and the interest/tip features
6. Add the "Interested" counter to event cards
7. Add the tip tags feature to event detail views

**What changes for users:** They tap a parish and see this week's bulletin highlights. They discover an "Events" option and suddenly can browse everything happening in the region. This is the moment the app goes from useful to indispensable.

**Verify before moving on:** Open the app, tap a parish, see fresh bulletin items. Use the event view, filter by category, find events at parishes you haven't saved. Tap "Interested" and see the count increment. Test on mobile and desktop.

### Batch 4: The review dashboard and automation (Weeks 8–9)

**What you're building:** The admin tools that make your weekly maintenance sustainable, and the automation that runs the pipeline hands-off.

**Step by step:**
1. Build the Bulletin Review Queue page — shows parsed items with the original page image alongside the extracted data
2. Add approve/edit/discard/unchanged actions to each item
3. Add the "Auto-approve unchanged" batch action
4. Build the progress tracker ("47 of 52 items reviewed")
5. Set up the weekly scheduled task that fetches and parses all bulletins every Saturday morning
6. Add error handling — what happens when a bulletin URL is broken, a PDF is corrupted, or the AI returns garbage
7. Build the "parish profile" system — per-parish notes that get injected into the AI's instructions to improve accuracy over time
8. Add the week-over-week comparison that flags only new/changed items

**What changes for users:** Nothing visible — this is all admin tooling. But for you, it transforms bulletin processing from a multi-hour manual task into a 60–90 minute review session.

**Verify before moving on:** Run a full Saturday morning cycle. All bulletins fetch. All parse. The review queue shows items grouped by parish with confidence scores. You can get through 50 parishes in under an hour. The published items appear correctly in the app.

### Batch 5: Email subscriptions and donations (Weeks 10–11)

**What you're building:** The email digest system and the donation pathway.

**Step by step:**
1. Build the subscription form (email + parish selection + interest categories)
2. Store subscriptions in the database with an unsubscribe token
3. Design the email template — clean, readable, mobile-friendly, with the three-section layout (Your Parish / Picked For You / More This Week)
4. Build the weekly digest compiler — the code that assembles personalized content for each subscriber
5. Connect to Resend's API for sending
6. Build the unsubscribe page and preference management page
7. Add the Ko-fi donation card to the More tab
8. Add the donation link to the email footer
9. Create the Ko-fi page with project description, preset amounts ($2, $5, $10), and a warm mission statement
10. Print QR code cards for church vestibules linking to the subscribe page

**What changes for users:** They can subscribe to a weekly email. The More tab has a "Subscribe" section and a "Support" section. People who subscribe start receiving Saturday evening digests.

**Verify before moving on:** Subscribe with your own email. Receive the digest. Verify it's personalized to your saved parishes and interests. Click "Add to Calendar" from the email — it works. Click "View in App" — it opens the event. Click "Unsubscribe" — it works instantly. Test on both desktop email and iPhone Mail.

### Batch 6: Contributor portal (Weeks 12–13)

**What you're building:** The system that lets trusted volunteers help verify data.

**Step by step:**
1. Enable Supabase Auth with "magic link" email login (no passwords)
2. Build the contributor roles system (Bulletin Spotter, Data Verifier, Trusted Editor)
3. Build the contributor dashboard page (`/contribute`)
4. Add the invite and management tools to the admin panel
5. Build the Bulletin Spotter view — show this week's items for their parish, with confirm/flag buttons
6. Build the Data Verifier view — show parishes due for verification, with verify/suggest buttons
7. Route all contributor submissions to your review queue (except Trusted Editors, who publish directly)
8. Recruit 5–10 initial contributors from your parish community

**What changes for users:** A few trusted parishioners start helping maintain the data. Your weekly review time drops further as spotters confirm items at their parishes. The data quality improves because local knowledge catches things you'd miss.

**Verify before moving on:** Invite a test contributor. They receive the email link, log in, see their dashboard, confirm a few items, flag one. Their submissions appear in your review queue. The whole flow works on a phone.

---

## Accessibility standards baked into every screen

These aren't a separate "accessibility phase" — they're built into every batch from the start.

### Touch targets
Every button, link, and tappable card: minimum **48 × 48 points** (Apple says 44, but research on older adults recommends 48). At least 12 points of spacing between adjacent targets. The existing app is already good at this — the tab bar buttons and chip filters are well-sized. Apply the same standard to all new elements.

### Text and contrast
Body text: **17 point minimum** (already the case in the current design). The navy-on-white palette (#2C3E5A on #FFFFFF) provides **10.3:1 contrast** — well above the 7:1 recommended for this audience. Gold accent text (#7D6520 on white) provides 5.4:1 — acceptable for AA but worth testing with your users. All new text follows these same pairings.

### Dynamic Type
When an iPhone user sets their system text to Extra Large or one of the Accessibility sizes, the app's text should scale accordingly. For a web-based app, this means using relative font sizes (`rem` units rather than fixed `px`) and testing at 200% zoom in the browser. The existing CSS custom properties (`--text-sm`, `--text-base`, `--text-lg`) are the right foundation — ensure they're defined in relative units.

### Motion and animation
Respect the user's "Reduce Motion" system setting. In CSS: wrap any animations in `@media (prefers-reduced-motion: no-preference) { }` so they only play when the user hasn't requested reduced motion. The existing card entrance animations and smooth scrolling should be wrapped this way.

### Screen readers
Every interactive element needs a clear text label via `aria-label`. The existing code already does this for most elements (the filter chips, sort button, search input all have labels). New elements must follow the same pattern. Event cards should announce: "Fish Fry at St. Mary's, Friday March 14, 5 to 7 PM, 12 people interested."

### Print view
Add a print stylesheet that renders the "This Week" event list as a clean single-page summary. For the 75-year-old who wants to print the week's events and put them on the fridge. In CSS: `@media print { }` with rules that hide the tab bar, search, and navigation, showing only the event content in a clean, large-text layout.

---

## What success looks like at each stage

**After Batch 1 (database migration):**
The app works exactly as before but you can now update parish data through the database instead of editing a JSON file and pushing to GitHub.

**After Batch 3 (bulletin content live):**
Users open the app and see "This Week's Bulletin" in their parish's detail panel. Word of mouth starts: "Have you tried MassFinder? It shows you everything from the bulletin." Usage grows from utility lookups to weekly browsing.

**After Batch 5 (email subscriptions live):**
People subscribe. The Saturday digest starts arriving. Subscribers forward the email to friends. "You should sign up for this — it shows you everything happening at the Catholic churches around here." Subscriber count grows organically.

**After Batch 6 (contributors active):**
A small team of volunteers — maybe 5–10 people across the region — actively helps keep data fresh. Your personal maintenance load drops to under an hour per week. The data quality is the best it's ever been because local parishioners are verifying their own parishes.

**Six months in:**
150 parishes parsed weekly. 200+ email subscribers. 10+ active contributors. $30–40/month in costs covered by $50–100/month in small donations. The app is the go-to resource for "what's happening at Catholic churches in Western New England" — a tool that genuinely did not exist before and that the community relies on.

---

## What V3 looks like (for future reference, not for now)

- iOS App Store via Capacitor wrapper (push notifications, widgets, home screen badge)
- Android app via the same Capacitor codebase
- Natural language search ("Where can I go to confession Saturday afternoon?")
- Parish comparison view for newcomers
- Live calendar feed subscriptions (add a URL to Apple Calendar, events auto-update)
- Expanded coverage beyond Western New England
- Diocesan partnerships for official endorsement and distribution
- Catholic foundation grants for sustained funding

None of this needs to be thought about until V2 is humming. Get the bulletins flowing. Get the emails going out. Get 10 volunteers helping. Then V3 is a conversation worth having.
