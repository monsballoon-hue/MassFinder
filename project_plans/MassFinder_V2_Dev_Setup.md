# MassFinder V2 — Your Workstation Setup

**Everything you need installed, configured, and ready to go before writing a single line of V2 code.** Organized from "install this first" to "nice to have later."

---

## The honest answer on Claude Code vs. Claude chat

You're right that Claude Code uses dramatically less of your usage allowance, and yes, it's partly by design. Here's what's happening:

**This chat app** accumulates the entire conversation in memory. By the time we're 15 messages deep with research results, file contents, and long responses, each new message I process includes 50,000+ words of context. That's expensive. And because you're on Opus in this interface (the most capable but heaviest model), each exchange costs more.

**Claude Code** works differently in three ways:
1. It sends only the relevant context for each task — the file you're editing, the instructions, and maybe a few related files. Not the entire conversation history.
2. It defaults to Sonnet for most operations (writing code, making edits, running commands) and only uses Opus when it needs deep reasoning. Sonnet is much lighter.
3. Each task is more focused — "edit this function" vs. "research everything about Catholic tech and write a 5,000-word report."

**The practical implication for you:** Use this chat for planning, strategy, research, and spec work. Use Claude Code for all actual implementation — writing code, editing files, running tests, debugging. You'll get 10x more implementation work done per dollar of usage.

Once you drop to Claude Pro after dev work calms down, Claude Code will still be highly productive for maintenance tasks. The heavy Opus usage is really only needed for the kind of big-picture sessions we've been doing.

---

## Layer 1: What's already on your Mac (confirm these)

### Git
Your Mac almost certainly has Git already. Open Terminal and type:
```
git --version
```
If it shows a version number, you're set. If it prompts you to install Xcode Command Line Tools, say yes — that installs Git along with other development essentials.

### Node.js (you need version 18 or newer)
Check what you have:
```
node --version
```
If it says v18 or higher, great. If it's older or missing, install it via the easiest path:

**Recommended: Install nvm (Node Version Manager)** — this lets you switch Node versions painlessly, which matters because Vercel's serverless functions require Node 18+.
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```
Close and reopen Terminal, then:
```
nvm install 20
nvm use 20
```
Now `node --version` should show v20.x.

### npm (comes with Node)
Verify:
```
npm --version
```
If Node is installed, npm is too. No separate step needed.

---

## Layer 2: Service accounts to create (all free)

Set these up before touching any code. Each takes 5–10 minutes.

### 1. Supabase account
**What it is:** Your database. Replaces the static JSON files.
**Go to:** supabase.com → Sign up with GitHub
**Create a project:** Name it "massfinder", choose the free tier, pick the US East region (closest to New England), set a database password (save this somewhere safe — a password manager, not a sticky note).
**What you'll need from it:** The project URL and the "anon" API key. Both are on the project's Settings → API page. You'll use these in your code to connect to the database.

### 2. Anthropic API account
**What it is:** How the bulletin parsing script talks to Claude's vision capability.
**Go to:** console.anthropic.com → Sign up
**Add credits:** $10 to start (this will parse ~200+ bulletins before running out). You can set a monthly spend limit to prevent surprises — set it at $30.
**Create an API key:** Go to API Keys → Create Key → Name it "massfinder-bulletins" → Copy and save the key.

### 3. Resend account (for email digests)
**What it is:** Sends the weekly email digests to subscribers.
**Go to:** resend.com → Sign up
**Verify a sending domain:** You'll add a few DNS records to your domain (massfinder.com or wherever you host). Resend walks you through this step by step. Until you do this, you can send test emails to yourself from their onboarding@resend.dev address.
**Create an API key:** Dashboard → API Keys → Create.

### 4. Ko-fi page (for donations)
**What it is:** Where people go to support the project.
**Go to:** ko-fi.com → Sign up → Connect Stripe or PayPal
**Set up your page:** Add a description ("MassFinder is a free Catholic community project serving Western New England..."), a profile picture (the MassFinder icon works), and preset donation amounts ($2, $5, $10).

**You already have:** GitHub account, Vercel account, Web3Forms account, Google Analytics. Those don't change.

---

## Layer 3: Command-line tools to install

Open Terminal and run these one at a time.

### Vercel CLI (you may already have this)
```
npm install -g vercel
```
Then log in:
```
vercel login
```
This lets you deploy, preview, and manage your project from the terminal instead of only through GitHub pushes.

### Supabase CLI
```
brew install supabase/tap/supabase
```
Then log in:
```
supabase login
```
Link to your project:
```
cd ~/your-massfinder-folder
supabase link --project-ref YOUR_PROJECT_REF
```
(The project ref is in your Supabase dashboard URL — the random string after `app.supabase.com/project/`.)

**What the Supabase CLI does for you:**
- Run database migrations (schema changes) from your code editor
- Generate TypeScript types from your database schema (makes Claude Code's suggestions more accurate)
- Test server functions locally before deploying
- Pull/push database changes between your local machine and the cloud

### pdf2pic dependencies
The bulletin parsing script needs to convert PDF pages to images. This requires GraphicsMagick and Ghostscript:
```
brew install graphicsmagick ghostscript
```
Verify both installed:
```
gm version
gs --version
```

---

## Layer 4: VSCode extensions

Open VSCode → Extensions sidebar (the square icon) → search and install each of these.

### Already essential (keep what you have)
- **Claude Code** (Anthropic) — your primary development partner. Already installed.

### Add these for V2 development

**Supabase** (by Supabase)
- Lets you browse your database tables, inspect data, and run SQL queries right inside VSCode
- Shows your schema, which helps Claude Code understand your database when writing queries
- Search "Supabase" in the extensions marketplace

**REST Client** (by Huachao Mao)
- Test your API endpoints without leaving VSCode
- Write a `.http` file with your API calls, click "Send Request," see the response
- Invaluable for testing your `/api/parishes`, `/api/events`, `/api/bulletins` endpoints
- Search "REST Client" — it's the one with 10M+ downloads

**Thunder Client** (alternative to REST Client if you prefer a visual interface)
- More like Postman but built into VSCode
- Visual interface for building and testing API calls
- Either this or REST Client — you don't need both

**ESLint** (by Microsoft)
- Catches JavaScript errors as you type rather than when you deploy
- You've been writing vanilla JS without a linter — adding this now will flag potential issues in your existing code too
- Search "ESLint" — the one by Microsoft with 30M+ downloads

**Prettier** (by Prettier)
- Auto-formats your code on save so you never think about indentation or semicolons
- Set it as your default formatter: VSCode Settings → search "Default Formatter" → select "Prettier"
- Turn on "Format On Save" in settings

**Error Lens** (by Alexander)
- Shows error and warning messages *inline* in your code, right next to the problem line
- Instead of squinting at the Problems panel, errors appear in red text right where they are
- Huge time-saver when debugging

**GitLens** (by GitKraken)
- Shows who changed what line and when, right in the editor
- Useful when you're comparing what the code looked like before a change
- The free version does everything you need

**Live Server** (by Ritwick Dey)
- Right-click `index.html` → "Open with Live Server" → your app opens in Chrome and auto-refreshes when you save changes
- Way faster than manually refreshing the browser after every edit
- Search "Live Server" — 40M+ downloads

### Nice to have but not critical

**GitHub Copilot** (by GitHub, $10/month)
- AI code completion that suggests code as you type
- Works alongside Claude Code — Copilot suggests the next line, Claude Code handles bigger tasks
- You already have Claude Max so this is optional, but the inline suggestions are genuinely fast for repetitive code
- Skip this if you're watching the budget — Claude Code covers the same ground

**SQLTools** (by Matheus Teixeira) + **SQLTools PostgreSQL driver**
- Run SQL queries against your Supabase database directly from VSCode
- Useful if you prefer writing SQL directly rather than using the Supabase dashboard
- More powerful than the Supabase extension for complex queries

**Image Preview** (by Kiss Tamás)
- Shows image previews on hover in your code
- Helpful when working with bulletin page images — you can see what image a file path points to

---

## Layer 5: Project structure changes

Your repo currently looks like this:
```
MassFinder/
  index.html          ← the entire PWA
  admin.html          ← parish editor
  parish_data.json    ← static parish data
  events.json         ← static events
  parish_data.schema.json
  sw.js
  manifest.json
  scripts/            ← prep-review, audit-urls
  review/             ← validation findings
  .github/            ← CI validation
```

V2 adds an `api/` folder for server functions and a `lib/` folder for shared code:
```
MassFinder/
  index.html          ← same PWA, minor fetch URL changes
  admin.html          ← enhanced with review dashboard
  parish_data.json    ← kept as offline fallback
  events.json         ← kept as offline fallback
  sw.js               ← updated to handle API routes
  manifest.json
  
  api/                ← NEW: Vercel serverless functions
    parishes.js       ← serves parish data from Supabase
    events.js         ← serves events from Supabase
    bulletins/
      latest.js       ← latest parsed bulletin items
      search.js       ← full-text search
    subscribe.js      ← email subscription management
    digest.js         ← weekly email digest sender
    admin/
      ingest.js       ← trigger bulletin parsing
      review.js       ← approve/reject parsed items
  
  lib/                ← NEW: shared utilities
    supabase.js       ← database connection setup
    parse-bulletin.js ← the AI bulletin parser
    email-template.js ← digest email template
  
  scripts/            ← existing + new
    migrate-data.js   ← one-time: load JSON into Supabase
    prep-review.js    ← existing
    audit-urls.js     ← existing
  
  review/             ← existing
  .github/            ← existing CI + new cron workflow
  
  vercel.json         ← NEW: configures API routes
  .env.local          ← NEW: your API keys (never committed to Git)
  package.json        ← NEW: declares dependencies
```

### The `.env.local` file (critical — never commit this to Git)

Create this file in your project root. It holds your secret keys:
```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_KEY=eyJhbGciOi...
ANTHROPIC_API_KEY=sk-ant-...
RESEND_API_KEY=re_...
```

Add `.env.local` to your `.gitignore` file so it never gets pushed to GitHub. Vercel reads these same values from its Environment Variables settings (Project Settings → Environment Variables), so your deployed functions have access without exposing the keys publicly.

### The `package.json` file

Your project doesn't have one yet — it's been pure static files. V2 adds Node.js dependencies:
```json
{
  "name": "massfinder",
  "private": true,
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "pdf2pic": "^3.1.0",
    "resend": "^4.0.0",
    "@react-email/components": "^0.0.25"
  }
}
```

Run `npm install` after creating this file. It creates a `node_modules/` folder (add this to `.gitignore` too) and a `package-lock.json` (this one *does* get committed).

### The `vercel.json` file

Tells Vercel how to route API requests:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" }
  ]
}
```

This means when a browser requests `massfinder.vercel.app/api/parishes`, Vercel runs your `api/parishes.js` function. Everything else still serves static files as before.

---

## Layer 6: Your daily workflow

Here's what a typical development evening looks like with this setup:

### Starting a work session (2 minutes)
1. Open VSCode
2. Open the MassFinder folder
3. Open Terminal in VSCode (`` Ctrl+` ``)
4. Start Live Server on `index.html` (right-click → Open with Live Server)
5. You now have the app running locally with hot reload

### Working with Claude Code (the main event)
Claude Code is your primary implementation partner. The workflow:

1. **Describe what you want to build** in plain language in the Claude Code panel:
   > "Create the api/parishes.js serverless function that queries the parishes table from Supabase and returns the data in the same JSON shape as parish_data.json"

2. **Claude Code writes the code**, often creating or editing multiple files at once. Review what it wrote.

3. **Test locally** — use Live Server for frontend changes, or the REST Client extension to test API endpoints.

4. **Commit and push** when you're satisfied:
   ```
   git add .
   git commit -m "Add parishes API endpoint"
   git push
   ```
   Vercel auto-deploys from the push. Check the preview URL.

### Testing API endpoints (30 seconds per test)
Create a file called `test.http` in your project root:
```http
### Get all parishes
GET http://localhost:3000/api/parishes

### Search bulletins
GET http://localhost:3000/api/bulletins/search?q=fish+fry

### Test subscription
POST http://localhost:3000/api/subscribe
Content-Type: application/json

{
  "email": "test@example.com",
  "parishes": ["parish_001"],
  "categories": ["social", "devotional"]
}
```
Click "Send Request" above any block to test it. The response shows up right in the editor.

### Running the bulletin parser manually
During development and testing:
```
node lib/parse-bulletin.js --parish parish_001
```
This fetches one parish's bulletin, converts to images, sends to Claude API, and outputs the structured data. You'll run this manually during Batch 2 to test and refine the parsing before automating it.

### Deploying changes
The same as today — push to the `dev` branch, check the preview, merge to `main` when ready. Vercel handles the rest.

---

## Layer 7: The AI-assisted workflow that makes one person enough

This is the most important section. The tools above are just tools — the real multiplier is *how* you use Claude Code and this chat together.

### Use this chat (Claude.ai) for:
- Planning what to build next
- Debugging complex issues where you need to think through architecture
- Writing prompts for the bulletin parser (prompt engineering is a conversation, not a code edit)
- Reviewing the V2 plan and adjusting priorities
- Generating data migration scripts from large JSON files
- Research and strategic decisions

### Use Claude Code for:
- All actual code writing and editing
- Creating new files (API routes, templates, scripts)
- Modifying `index.html`, `admin.html`, `sw.js`
- Writing database queries and migrations
- Debugging specific errors ("this function returns undefined, fix it")
- Running terminal commands
- Git operations

### Use Supabase Dashboard for:
- Browsing data visually (see what's in the bulletin_items table)
- Running one-off SQL queries
- Checking auth users (contributors)
- Monitoring database performance
- Editing individual records when you just need to fix one thing quickly

### A realistic evening session (2–3 hours)

**Night 1: Batch 1 kickoff**
- Open Claude Code
- "Set up the Supabase connection in lib/supabase.js using the environment variables"
- "Create the migration script that reads parish_data.json and inserts each parish into the parishes table"
- Run the migration: `node scripts/migrate-data.js`
- Check Supabase Dashboard — see your 93 parishes in the table
- "Create api/parishes.js that queries the parishes table and returns the same JSON shape the frontend expects"
- Test with REST Client
- Done for the night. Commit and push.

**Night 2: Continue Batch 1**
- "Create api/events.js, same pattern as parishes.js"
- "Update the two fetch calls in index.html to point to /api/parishes and /api/events"
- Open in Live Server, verify everything works
- Test in Chrome incognito
- Deploy to dev, test the preview URL
- Merge to main
- Done. Batch 1 complete.

**Night 3: Start Batch 2**
- "Create lib/parse-bulletin.js — a script that takes a bulletin PDF URL, converts each page to a PNG using pdf2pic, sends each image to Claude Sonnet's vision API with this prompt [paste prompt], and returns the structured JSON"
- Test with one LPi bulletin URL you know works
- Look at the output — compare against the actual bulletin
- Refine the prompt based on what it got wrong
- Done for the night.

That's three evenings, maybe 7–8 total hours, and you've got the database migrated and the bulletin parser prototyped. Each evening is a contained, completable chunk.

### The key principle: describe the outcome, not the code

When talking to Claude Code, say:
> "Make the parish detail panel show this week's bulletin items below the schedule section. Each item should be a card with the category icon, title, date/time, and description. Use the same card styling as the existing community events section."

Don't say:
> "Create a function called renderBulletinItems that takes a parish_id parameter and fetches from the bulletin_items table..."

Let Claude Code figure out the implementation. Describe what you want the user to see and experience. Claude Code is better at translating intent into code than you are at writing code by hand — that's the whole point. Your job is editorial: does the result look right? Does it work? Ship it or ask for changes.

---

## Quick reference: everything to install, in order

**Terminal commands (run these one at a time):**
```bash
# 1. Node version manager + Node 20
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# (restart terminal)
nvm install 20

# 2. Vercel CLI
npm install -g vercel
vercel login

# 3. Supabase CLI
brew install supabase/tap/supabase
supabase login

# 4. PDF processing dependencies
brew install graphicsmagick ghostscript
```

**VSCode extensions (search and install):**
1. Claude Code (already have)
2. Supabase
3. REST Client
4. ESLint
5. Prettier
6. Error Lens
7. GitLens
8. Live Server

**Accounts to create:**
1. Supabase (supabase.com) — free project
2. Anthropic API (console.anthropic.com) — $10 initial credits
3. Resend (resend.com) — free tier
4. Ko-fi (ko-fi.com) — donation page

**Files to create in the project:**
1. `.env.local` (API keys, never committed)
2. `package.json` (dependencies)
3. `vercel.json` (API routing)
4. Add `.env.local` and `node_modules/` to `.gitignore`

Once all of this is in place, you open VSCode, open Claude Code, and say "Let's start Batch 1." Everything else flows from there.
