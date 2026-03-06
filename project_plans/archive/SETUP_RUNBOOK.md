# MassFinder V2 — Setup Runbook

**Purpose:** Get your machine and accounts fully configured for V2 development.
**Time:** ~45–60 minutes total. Do it in one sitting.

---

## Prerequisites (you already have these)

- [x] GitHub account — repo is public at `monsballoon-hue/MassFinder`
- [x] Vercel account — connected to GitHub, auto-deploys `dev` and `main`
- [x] Web3Forms account — API key in `index.html`
- [x] Google Analytics — `G-0XWS7YKHED` configured
- [x] VSCode installed
- [x] Claude Code extension installed
- [x] Git installed

---

## Part 1: Upgrade Node.js (10 min)

Your machine has Node.js v12. Supabase SDK and Vercel CLI require v18+.

### Install nvm (Node Version Manager)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

**Close and reopen your terminal** (or run `source ~/.zshrc`), then:

```bash
# Install Node 20 (current LTS)
nvm install 20

# Set it as default so every new terminal uses it
nvm alias default 20

# Verify
node --version    # should show v20.x.x
npm --version     # should show 10.x.x
```

> **Note:** Your old Node 12 is still there. If you ever need it: `nvm use 12`. But all V2 work uses Node 20.

---

## Part 2: CLI Tools (10 min)

### Homebrew (if not installed)

Check first:
```bash
brew --version
```

If not found:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Vercel CLI

```bash
npm install -g vercel
vercel login
```

Choose "Continue with GitHub" when prompted. This links your existing Vercel account.

**Verify:**
```bash
vercel whoami    # should show your username
```

### Supabase CLI

```bash
brew install supabase/tap/supabase
supabase login
```

This opens a browser for auth. Approve the connection.

**Verify:**
```bash
supabase --version
```

### PDF Processing Dependencies (for Batch 2)

> You can skip this now and come back before Batch 2. Including it here so you can do it all at once.

```bash
brew install graphicsmagick ghostscript
```

**Verify:**
```bash
gm version       # should show GraphicsMagick version
gs --version      # should show Ghostscript version
```

---

## Part 3: Accounts to Create (15 min)

### 1. Supabase — your database

1. Go to **https://supabase.com**
2. Click **Start your project** → Sign up with GitHub
3. Create a new organization (or use default)
4. **Create a new project:**
   - Name: `massfinder`
   - Database password: generate a strong one → **save it in your password manager**
   - Region: **US East (North Virginia)** — closest to New England
   - Plan: Free
5. Wait ~2 minutes for provisioning
6. Go to **Settings → API** (left sidebar)
7. Copy and save these two values:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **service_role key** (under "Project API keys" — the `secret` one, NOT `anon`)

> **Why service_role and not anon?** Your API routes run server-side on Vercel. The service_role key has full database access and is never exposed to browsers. Safe in serverless functions.

### 2. Anthropic API — bulletin parsing

1. Go to **https://console.anthropic.com**
2. Sign up (email or Google)
3. Go to **Settings → Billing** → Add $10 in credits
4. Set a **monthly spend limit of $30** (Settings → Limits) — prevents surprises
5. Go to **API Keys → Create Key**
   - Name: `massfinder-bulletins`
   - Copy the key → **save it** (starts with `sk-ant-api03-...`)

### 3. Resend — email digests (needed by Batch 5)

> You can create this later, but it takes 5 minutes now.

1. Go to **https://resend.com**
2. Sign up (email or GitHub)
3. On the dashboard, go to **API Keys → Create API Key**
   - Name: `massfinder`
   - Permission: Sending access
   - Copy the key → **save it** (starts with `re_...`)
4. **Domain verification** (do this when you're ready for Batch 5):
   - Go to **Domains → Add Domain**
   - Follow the DNS record instructions for your domain
   - Until verified, you can send test emails from `onboarding@resend.dev`

### 4. Ko-fi — donations (needed by Batch 5)

> Also deferrable. 5 minutes when you're ready.

1. Go to **https://ko-fi.com**
2. Sign up → Connect Stripe or PayPal
3. Set up your page:
   - Display name: `MassFinder`
   - Description: "MassFinder is a free Catholic community project serving Western New England. Your support helps cover hosting and AI costs (~$30/month)."
   - Profile image: use the MassFinder cross icon
   - Preset amounts: **$2, $5, $10**

---

## Part 4: Project Environment File (5 min)

Create the `.env.local` file in your repo root. This holds your secret keys locally and is already gitignored.

```bash
cd /Users/mikecomp/Desktop/massfinder-repo
```

Create the file:

```
# .env.local — secret keys for local development
# NEVER commit this file. It's in .gitignore.

# Supabase (from Settings → API in your Supabase dashboard)
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key...

# Anthropic (from console.anthropic.com → API Keys)
ANTHROPIC_API_KEY=sk-ant-api03-...your-key...

# Resend (from resend.com → API Keys) — fill in when ready for Batch 5
# RESEND_API_KEY=re_...your-key...
```

Replace the placeholder values with your actual keys.

**Then link your Supabase project to the CLI:**

```bash
cd /Users/mikecomp/Desktop/massfinder-repo
supabase link --project-ref YOUR_PROJECT_REF
```

> Your project ref is the random string in your Supabase dashboard URL: `app.supabase.com/project/XXXXXXXX`

---

## Part 5: Vercel Environment Variables (5 min)

Your deployed API routes need these same keys. Set them in the Vercel dashboard:

1. Go to **https://vercel.com** → Your MassFinder project → **Settings → Environment Variables**
2. Add each variable for **all environments** (Production, Preview, Development):

| Key | Value | Sensitive? |
|-----|-------|-----------|
| `SUPABASE_URL` | `https://YOUR_REF.supabase.co` | No |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | **Yes** |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | **Yes** |

> Mark sensitive keys as "Sensitive" — Vercel will hide the value after saving.

---

## Part 6: VSCode Extensions (5 min)

Open VSCode → Extensions sidebar (square icon) → search and install each:

### Essential for V2

| Extension | Author | What it does |
|-----------|--------|-------------|
| **Supabase** | Supabase | Browse tables, run SQL, see schema — all inside VSCode |
| **REST Client** | Huachao Mao | Test API endpoints from `.http` files with one click |
| **ESLint** | Microsoft | Catches JS errors as you type |
| **Prettier** | Prettier | Auto-formats code on save |
| **Error Lens** | Alexander | Shows errors inline next to the problem line |
| **GitLens** | GitKraken | Shows who changed what and when, inline |
| **Live Server** | Ritwick Dey | Right-click HTML → Open with Live Server → auto-refresh on save |

### After installing Prettier

1. Open VSCode Settings (`Cmd + ,`)
2. Search **"Default Formatter"** → select **Prettier - Code formatter**
3. Search **"Format On Save"** → check the box

---

## Part 7: Verify Everything Works (5 min)

Run these checks one at a time. All should pass:

```bash
# Node.js 20
node --version
# Expected: v20.x.x

# npm
npm --version
# Expected: 10.x.x

# Vercel CLI
vercel whoami
# Expected: your username

# Supabase CLI
supabase --version
# Expected: 1.x.x or 2.x.x

# GraphicsMagick (skip if you deferred)
gm version
# Expected: GraphicsMagick version info

# Ghostscript (skip if you deferred)
gs --version
# Expected: 10.x.x

# Your .env.local exists and has real values
cat .env.local | head -5
# Expected: see your SUPABASE_URL line (not placeholders)

# Supabase connection works
supabase db ping
# Expected: OK or connection success
```

---

## Quick Reference Card

| What | Where | Key/URL |
|------|-------|---------|
| Supabase Dashboard | `app.supabase.com/project/YOUR_REF` | service_role key in `.env.local` |
| Anthropic Console | `console.anthropic.com` | API key in `.env.local` |
| Vercel Dashboard | `vercel.com/YOUR_PROJECT` | Env vars in Settings |
| Resend Dashboard | `resend.com` | API key (Batch 5) |
| Ko-fi Page | `ko-fi.com/massfinder` | (Batch 5) |
| GitHub Repo | `github.com/monsballoon-hue/MassFinder` | — |
| Local Dev | `http://localhost:3000` via `vercel dev` | — |
| Live (dev) | your Vercel preview URL | — |
| Live (prod) | your Vercel production URL | — |

---

## What's Next

Once everything above is green, you're ready for **Batch 1: Database Foundation**.

The first working session:
1. Create the Supabase tables (run SQL in the Supabase SQL Editor)
2. Create `package.json` and install `@supabase/supabase-js`
3. Write the migration script
4. Create the API routes
5. Update `init()` in `index.html`
6. Test, deploy, verify

See [ROADMAP.md](ROADMAP.md) § Batch 1 for the full spec.
