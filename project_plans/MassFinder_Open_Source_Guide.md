# Opening MassFinder to Contributors — The Honest Guide

## The realistic picture first

Your repo is already public. Anyone can see it right now. You have a CONTRIBUTING.md, a CLAUDE.md, a DATA_STANDARDS.md, a schema validator in CI, and a dev/main branch workflow. That puts you ahead of 90% of small open source projects in terms of documentation.

But "public repo with good docs" and "active open source project with contributors" are very different things. Here's what's actually true about attracting developer contributors to a niche Catholic community app serving Western New England:

**You're not going to get hundreds of contributors.** This isn't a developer tool or a JavaScript framework. The intersection of "knows how to code," "is Catholic or sympathetic to the mission," "lives in or cares about Western New England," and "has free time to contribute to someone else's project" is small. That's fine.

**You realistically could get 3–10 developers.** That's the sweet spot for a project like this. A Catholic software engineer in Springfield who sees the app at Mass and thinks "I could help with that." A college student at Holy Cross or UMass who needs an open source project for their resume. A retired developer in the diocese who wants to give back. A young professional in the Catholic tech community who stumbles on the repo through Catholic Open Source or SENT Ventures networks.

**3–10 good developers changes everything.** One person who takes ownership of the iOS Capacitor wrapper. One person who builds the email digest template. One person who writes the bulletin parser tests. One person who adds accessibility improvements. You're no longer doing everything yourself — you're directing a small team, reviewing their work, and focusing your own time on the things only you can do (data verification, community relationships, product direction).

---

## What you need to set up on GitHub

Your repo needs a few things to go from "technically open" to "actually welcoming to contributors."

### 1. GitHub Issues as the work board

Right now you have zero open issues. Issues are how contributors find work to do. Each issue is a self-contained task description — what needs to be built, why, and enough context to start.

**Create issue labels** (Settings → Labels):

| Label | Color | Purpose |
|-------|-------|---------|
| `good first issue` | #7057FF | Simple tasks for newcomers |
| `help wanted` | #008672 | Tasks you'd welcome help on |
| `frontend` | #D4C5F9 | HTML/CSS/JS work on the PWA |
| `backend` | #0E8A16 | API routes, database, server functions |
| `bulletin-parser` | #FBCA04 | AI parsing pipeline work |
| `accessibility` | #E4E669 | A11y improvements |
| `data` | #C2E0C6 | Parish data, events, validation |
| `design` | #F9D0C4 | UI/UX improvements |
| `documentation` | #0075CA | Docs, guides, comments |
| `bug` | #D73A4A | Something broken |
| `enhancement` | #A2EEEF | New feature |
| `infrastructure` | #BFD4F2 | CI/CD, deployment, tooling |

The two most important labels are **`good first issue`** and **`help wanted`**. GitHub literally surfaces these in its contributor discovery features — when someone searches "good first issues" in a topic area, your issues can appear.

**Write 10–15 issues to start.** Here's what makes a good contributor issue:

Bad: "Make the app better"
Good:

> **Title:** Add print stylesheet for weekly events view
>
> **Description:** Many of our users (55+ demographic) want to print the week's events and stick them on the fridge. We need a `@media print` stylesheet that:
> - Hides the tab bar, search, filters, and navigation
> - Shows only the event cards in a clean, large-text, single-column layout
> - Includes parish names and times in a readable format
> - Fits on one page for a typical week (5–10 events)
>
> **Files involved:** `index.html` (add print styles to the `<style>` block)
> **How to test:** Open the app, go to the events view, hit Cmd+P and check the preview
> **Labels:** `good first issue`, `frontend`, `accessibility`

That issue is self-contained. A developer can pick it up without asking you a single question. They know what files to edit, what the expected result looks like, and how to verify their work.

**Starter issues to create right now** (ranging from easy to moderate):

For `good first issue`:
1. Add `@media print` stylesheet for events view
2. Add `prefers-reduced-motion` media query wrapping all CSS animations
3. Add `aria-label` attributes to any interactive elements that are missing them
4. Add `prefers-color-scheme: dark` media query for basic dark mode support
5. Improve search to match against event titles and descriptions (not just parish names)
6. Add a "Copy link" button to event detail views for sharing
7. Write unit tests for the date/time formatting functions (`fmt12`, `toMin`, `getEaster`, `isLentSeason`)

For `help wanted`:
8. Build the Capacitor iOS wrapper with push notification support
9. Create the React Email template for the weekly digest
10. Add full-text search via Supabase's `tsvector` index
11. Build the contributor login flow using Supabase Auth magic links
12. Create an event detail page with Open Graph meta tags for rich link previews when shared
13. Build a PDF-to-image conversion pipeline that works in Vercel serverless functions
14. Add iCal feed endpoint (`/api/ical/parish/:id`) for calendar subscriptions

Each of these is a complete, shippable piece of work that doesn't depend on the others. A developer can pick one, work on it in isolation, submit a pull request, and move on.

### 2. Issue templates

Create `.github/ISSUE_TEMPLATE/` with three files:

**bug_report.md** — for reporting broken things:
```markdown
---
name: Bug Report
about: Something isn't working right
labels: bug
---

**What happened?**
<!-- A clear description of the bug -->

**What should have happened?**
<!-- What you expected -->

**Steps to reproduce:**
1. Go to...
2. Tap on...
3. See error...

**Device and browser:**
<!-- e.g., iPhone 14, Safari 17 / Desktop Chrome 120 -->

**Screenshot (if applicable):**
```

**feature_request.md** — for suggesting improvements:
```markdown
---
name: Feature Request
about: Suggest an improvement or new feature
labels: enhancement
---

**What problem does this solve?**
<!-- What's the pain point or unmet need? -->

**Describe the solution you'd like:**
<!-- How would it work from a user's perspective? -->

**Who benefits most?**
<!-- e.g., parishioners, parish staff, contributors -->
```

**data_correction.md** — specific to this project:
```markdown
---
name: Parish Data Correction
about: Report incorrect Mass times, contact info, or other parish data
labels: data
---

**Parish name and town:**

**What's wrong?**

**What it should say:**

**How do you know?** (e.g., attended Mass there, checked the bulletin, called the office)
```

### 3. Pull request template

Create `.github/PULL_REQUEST_TEMPLATE.md`:
```markdown
## What does this PR do?
<!-- Brief description -->

## Related issue
<!-- Link to the issue this addresses: Fixes #123 -->

## How to test
<!-- Steps for the reviewer to verify the change works -->

## Screenshots (if UI changes)
<!-- Before/after if applicable -->

## Checklist
- [ ] Tested in Chrome (desktop)
- [ ] Tested in Safari (mobile) if it's a UI change
- [ ] No console errors
- [ ] Accessible (proper aria labels, touch targets ≥ 44pt)
```

### 4. CODEOWNERS file

Create `.github/CODEOWNERS`:
```
# You review everything by default
* @monsballoon-hue

# But specific contributors can own specific areas
# (add these as people prove themselves)
# /api/bulletins/ @contributor-username
# /lib/parse-bulletin.js @contributor-username
```

This means every PR requires your approval before merging. As you develop trust with specific contributors, you can give them ownership of specific directories — so their PRs in those areas can be reviewed by them, reducing your review burden.

### 5. Branch protection rules

Go to Settings → Branches → Add rule for `main`:
- Require pull request reviews before merging (1 reviewer: you)
- Require status checks to pass (your schema validation CI)
- Do not allow bypassing these settings

This ensures nobody (including you in a late-night moment of haste) pushes broken code directly to production. Everything goes through a PR and passes validation.

### 6. A better README

Your current README renders the CONTRIBUTING.md content. For attracting developers, the README should lead with the *mission* and the *impact*, then get into the technical details. Developers contribute to projects they believe in. Lead with the why:

```markdown
# MassFinder

**A free Catholic community app for Western New England.**

MassFinder helps parishioners find Mass times, Confession, Adoration, 
and community events across 150+ parishes in Massachusetts, Connecticut, 
Vermont, and New Hampshire. It's a stewardship project — built for our 
faith community, not for profit.

🔗 **[massfinder.vercel.app](https://massfinder.vercel.app)**

## The vision

Every week, 150 parishes publish bulletins full of events, announcements, 
and schedule changes. That information is trapped in individual PDFs that 
nobody reads cover-to-cover. MassFinder is building a system that reads 
every bulletin, extracts the content, and makes it searchable, subscribable, 
and shareable — so parishioners can discover what's happening across their 
entire Catholic community, not just their home parish.

## Contributing

We welcome contributions! Check out our [open issues](link) — especially 
those labeled `good first issue`. See [CONTRIBUTING.md](CONTRIBUTING.md) 
for setup instructions.

**You don't need to be Catholic to contribute.** If you care about 
building technology that serves communities, you're welcome here.

## Tech stack

- Vanilla HTML/CSS/JS (no framework)
- Supabase (PostgreSQL database)
- Vercel (hosting + serverless functions)
- Claude API (bulletin parsing via vision)
- Resend (email digests)

## Current stats

- 150+ parishes across 4 states
- 1,400+ services tracked
- 200+ community events
```

That README tells a developer three things in 30 seconds: what the project does, why it matters, and that their help is wanted.

---

## Where to find contributors

### The Catholic tech community

**SENT Ventures** — the largest Catholic entrepreneurship gathering (~400 attendees at Notre Dame). They have a Slack community and online presence. Post about MassFinder there. Catholic developers who attend SENT are exactly the kind of people who'd contribute.

**Catholic Open Source (CatholicOS)** — a GitHub organization building open-source Catholic tools. They're small but active. Your project aligns perfectly with their mission. Reach out, list MassFinder in their ecosystem.

**r/Catholicism and r/CatholicProgrammers** on Reddit — post a "Show Reddit" post explaining what you're building and that you're looking for developer help. The Catholic subreddits are large and active.

**Catholic Twitter/X and Catholic LinkedIn** — the Catholic intellectual and professional community is surprisingly active on both platforms. A post about "I'm building an open-source Catholic community app and looking for developers" will get signal-boosted by Catholic tech people.

**Your own diocese** — the Diocese of Springfield likely has a communications office. Tell them about the project. They may know developers in the diocese, and they may even be willing to promote it through diocesan channels.

### The open source community broadly

**GitHub Topics** — add topics to your repo: `catholic`, `community`, `pwa`, `progressive-web-app`, `supabase`, `church`, `events`, `open-source`, `hacktoberfest` (if you participate in October). These make the repo discoverable through GitHub search.

**Hacktoberfest** (every October) — DigitalOcean's annual event where developers look for open source projects to contribute to. Tag your issues with `hacktoberfest` and you'll get drive-by contributors looking for PRs to submit. Quality varies, but it's free exposure and you might find someone who sticks around.

**dev.to and Hashnode** — write a blog post about building the bulletin parsing pipeline with Claude's vision API. The technical community is interested in real-world AI applications. Title it something like "I'm using AI to read 150 church bulletins a week — here's how." That's a compelling technical story that happens to introduce people to the project.

**College CS departments** — Holy Cross, UMass Amherst, WPI, Springfield College. CS students need open source projects for their portfolios and senior capstones. Contact the CS department, offer MassFinder as a capstone project option. One motivated CS student working on the Capacitor wrapper or the email system for a semester is worth months of your solo evenings.

---

## What developer contributors unlock

Here's where it gets exciting. With even 3–5 active developers, the project timeline compresses dramatically and features that are unreachable for one person become feasible.

### Things that are hard for one person but easy for a small team

**The iOS Capacitor wrapper.** This requires someone who knows Xcode, Swift (for widgets), and the App Store submission process. If a contributor owns this, you never have to learn Swift. They build the wrapper, the push notification integration, and the widget. You review and approve. The app hits the App Store months earlier than if you did it yourself.

**The email template.** A frontend developer who knows React Email (or just HTML email, which is its own weird specialty) could build a beautiful, tested, mobile-responsive digest template in a weekend. Email rendering is fiddly across mail clients — someone who enjoys that puzzle can save you days of debugging Gmail vs. Outlook vs. Apple Mail.

**Accessibility audit and fixes.** An accessibility-focused developer could run automated tools (axe, Lighthouse) and manual testing (VoiceOver, keyboard navigation) against the entire app and file 20 issues with specific fixes. Each fix is a small, self-contained PR. This is perfect "good first issue" territory and the results meaningfully improve the experience for your core demographic.

**Automated testing.** Right now the app has zero automated tests. A contributor could write tests for the critical logic — date parsing, service filtering, distance calculation, Lent detection, next-service computation. Once tests exist, every future change is safer because the tests catch regressions. You'd never write these tests yourself (let's be honest, it's not exciting work), but a contributor looking for a portfolio piece will happily do it.

**Performance optimization.** A performance-minded developer could profile the app, identify bottlenecks (the initial render of 150 parish cards, the Leaflet map initialization, the readings API call), and submit targeted improvements. Lazy loading, virtual scrolling, image optimization, service worker cache tuning — these are fun problems for developers who enjoy that niche.

### Things that become possible with a community

**Regional expansion.** Right now the app serves Western New England. What if a developer in the Hartford diocese wanted to add their parishes? Or someone in the Archdiocese of Boston? With a proper contributor system, each regional champion owns their area's data and maintenance. You maintain the platform; they maintain the parish coverage. The app could grow from 150 parishes to 500+ without your personal workload increasing.

**Diocesan adoption.** If the Diocese of Springfield sees that MassFinder has a development community behind it — not just one person — they're much more likely to officially endorse it. Diocesan technology offices worry about bus-factor risk: "What happens if Mike stops maintaining it?" An active contributor base answers that question.

**Multi-language support.** Your coverage area includes parishes with Spanish, Polish, Portuguese, and Vietnamese communities. A bilingual contributor could localize the UI (button labels, filter names, days of the week, notification text). The app currently displays content in the bulletin's language, but the interface itself is English-only. True localization is a substantial project that a contributor could own end-to-end.

**Native features you wouldn't build alone.** Siri Shortcuts integration ("Hey Siri, what Masses are near me?"). Apple Watch complication showing the next service at your saved parish. Android widget. Share extension that lets you share a bulletin item from any app into MassFinder. Each of these is a self-contained project that a motivated developer could tackle independently.

**A design contributor.** Not a developer — a UX designer who creates proper Figma mockups for new features before code is written. Even one design-oriented contributor who reviews UI changes and suggests improvements elevates the entire product. Catholic universities with design programs (Notre Dame, Loyola, Villanova) could be a source.

---

## How to manage contributions without it becoming a second job

This is the real concern. You've got a full-time job, a wife, two kids, and limited evening hours. The last thing you need is to become a full-time open source maintainer. Here's how to keep the overhead manageable:

### Protect your time with automation

**CI does the first review.** Your schema validation already blocks bad data. Extend this: add an ESLint check that catches JavaScript errors, add a Lighthouse CI check that flags accessibility or performance regressions. If a PR fails CI, you don't even look at it until the contributor fixes the automated issues.

**Issue templates filter noise.** The templates you set up force reporters to provide context. Vague issues ("the app doesn't work") get a template response: "Please fill out the bug report template so we can investigate."

**CODEOWNERS means you only review what matters.** Once a contributor proves themselves on 3–4 PRs, give them ownership of their area. Their PRs in that area don't need your review (or need only a quick glance).

### Set expectations clearly

Add a section to CONTRIBUTING.md:

```markdown
## Response times

This is a volunteer-maintained project. I review PRs and issues 
in the evenings and on weekends. Please allow 3–7 days for a 
response. If something is urgent (site is down, data is wrong), 
flag it in the issue title.

## What makes a great contribution

- Self-contained: one issue, one PR, one thing
- Tested: you've verified it works on mobile and desktop
- Accessible: touch targets ≥ 44pt, proper aria labels, good contrast
- Documented: if it's a new feature, update the relevant docs
- Small: PRs under 200 lines get reviewed fastest
```

This sets the tone: you're responsive but not on-call. Contributors who respect this are the ones you want.

### The "benevolent dictator" model

This is how most successful small open source projects work. You make all final decisions on product direction, design, and architecture. Contributors propose; you decide. This isn't a democracy, and that's okay. The CONTRIBUTING.md and README should make this clear:

> MassFinder's direction is guided by its mission: serving the Catholic community of Western New England. Feature proposals are evaluated on whether they genuinely serve the people who use this app — primarily parishioners aged 55 and older looking for information about their faith community. The maintainer has final say on all product decisions.

This prevents feature creep, prevents someone from showing up and trying to rewrite the app in React, and keeps the focus on the community you're serving.

### Batch your review time

Don't check GitHub notifications every night. Set aside two sessions per week — maybe Tuesday and Saturday evenings — where you spend 30–45 minutes reviewing any open PRs, responding to issues, and triaging new items. The rest of your available time goes to your own development work. Contributors who submit good PRs will wait a few days without complaint. If they can't, they're not the right contributors for this project.

---

## The files to create in the repo

Here's the complete list of GitHub community health files to add:

```
.github/
  ISSUE_TEMPLATE/
    bug_report.md
    feature_request.md
    data_correction.md
  PULL_REQUEST_TEMPLATE.md
  CODEOWNERS
  FUNDING.yml          ← enables the "Sponsor" button on GitHub
```

The `FUNDING.yml` is a nice touch — it puts a "Sponsor" button on your repo page:
```yaml
ko_fi: massfinder
custom: ["https://massfinder.vercel.app/support"]
```

Update the README with the mission-first structure. Add GitHub Topics to the repo (Settings → General → Topics). Add a description: "Free Catholic community app for Western New England — find Mass, events, and community life across 150+ parishes."

---

## The pitch when you reach out to potential contributors

Whether you're posting on Reddit, emailing a CS department, or talking to a developer after Mass, the pitch is simple:

> I'm building a free app that helps Catholics in our area find Mass times, events, and community activities across 150 parishes. It's open source, it serves real people (our grandparents are the primary users), and it's solving a problem nobody else has tackled — making the weekly parish bulletin searchable and subscribable across churches. I could use help with [specific thing]. The codebase is vanilla JS, Supabase, and Vercel — no framework, no complexity. Check it out at github.com/monsballoon-hue/MassFinder.

What makes this pitch work: it's concrete (150 parishes, real users), it's mission-driven (serving the community, not making money), it's technically interesting (AI-powered bulletin parsing), and it has a specific ask (not "help me" but "help with this specific thing").

---

## What to do first

1. **Create the 10–15 issues** with proper labels. This is the single highest-leverage thing. Without issues, there's nothing for contributors to work on.
2. **Add the issue and PR templates.** 15 minutes of file creation.
3. **Update the README** to lead with the mission.
4. **Add GitHub Topics** to the repo.
5. **Post in 2–3 places:** r/CatholicProgrammers, the Catholic Open Source community, and one local channel (your parish bulletin, diocesan newsletter, or a local Catholic Facebook group asking if anyone's a developer).

Then wait. The issues are the bat signal. The right developers will find them.
