# Spend Traker

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Live demo:** <https://spend-traker.vercel.app> (read-only demo account with synthetic data; sign-up and login are disabled)

A budget tracker for people in Costa Rica who pay with a BAC Credomatic card.
It reads the bank's notification emails from Gmail (read-only), turns each purchase, SINPE
transfer, or bill payment into a movement, and files it under a monthly category budget.
Anything the app is unsure about goes to a review list. Once you confirm a merchant or
concept, it is remembered and never asked again.

Built during a 5-day hackathon (HackaTob, November 2026). This repository is the cleaned,
open-source version of that project. It is **not affiliated with BAC Credomatic**.

## How a movement is classified

1. **Parse.** A regex parser reads the BAC email (card purchase, SINPE transfer, or service
   payment). If the layout is not recognized, an LLM extracts the fields instead.
2. **Classify.** The cheapest method that works wins:
   1. Memory of your earlier confirmations (merchant or SINPE concept)
   2. Keyword rules
   3. Google Places lookup for unfamiliar merchants
   4. LLM, as the last resort (the estimated token cost is shown per movement)
   5. Otherwise, marked **pending** for you to confirm
3. **Learn.** Confirming or correcting a category stores it, so the same merchant or concept
   skips the paid steps next time.

Without any API keys, steps 3 and 4 are skipped and uncertain movements go to review.

## Features

- Monthly budget per category, with the remaining amount shown first
- Gmail sync (daily cron plus a manual button), de-duplicated by message and reference
- Manual expenses and income, cards by last four digits
- Spanish (default) and English UI, light and dark theme, CRC and USD display
- Demo account with seeded synthetic data (no sign-up needed)

## Stack

Next.js (App Router), React 19, TypeScript, Tailwind CSS, Postgres (Neon in production,
embedded PGlite locally), Google OAuth for Gmail read-only, Vercel AI SDK with the Vercel AI
Gateway, Vitest. Designed to deploy on Vercel with a daily cron.

## Quick start (local, 2 minutes)

Requires [Node.js](https://nodejs.org) 20 or newer and Git.

```bash
git clone https://github.com/elizondosanti/spend-traker.git
cd spend-traker
npm install
cp .env.example .env.local   # optional: the app runs without any variable
npm run dev
```

Open <http://localhost:3000> and click the demo account. With no `DATABASE_URL`, data is
stored on your machine in `.data/` (embedded PGlite). Outside Vercel, the home screen has a
panel where you can paste a BAC notification email to see it parsed and classified.

Other scripts: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.

## Configuration

All variables are optional locally. See [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Empty uses local PGlite |
| `SESSION_SECRET` | Signs the session cookie. **Required in production** |
| `ENCRYPTION_KEY` | Optional key for the stored Gmail token; derived from `SESSION_SECRET` if unset |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Gmail OAuth. Redirect URI: `{APP_URL}/api/gmail/callback` |
| `GOOGLE_PLACES_API_KEY` | Optional merchant lookup |
| `AI_GATEWAY_API_KEY`, `AI_MODEL` | Optional LLM classification and extraction |
| `DEMO_ONLY` | `true` disables sign-up and login; only the seeded demo account works (for public demos) |
| `CRON_SECRET` | Authorizes the daily `/api/cron/gmail` job |

Never commit real secrets. Details in [SECURITY.md](SECURITY.md).

## Use it with your own Gmail (step by step)

Nothing is shared with the author and no credentials ship with this repository. You create
your own Google Cloud project, so Google only ever talks to *your* app.

**1. Create the Google Cloud project**
1. Go to <https://console.cloud.google.com/> and sign in.
2. Top bar → project picker → **New project** → name it `spend-traker` → **Create**.
3. Open **APIs & Services → Library**, search **Gmail API**, click **Enable**.

**2. Configure the consent screen**
1. **APIs & Services → OAuth consent screen** (or *Google Auth Platform*) → **Get started**.
2. App name `Spend Traker`, your email as support and contact email.
3. Audience: **External**. Finish the wizard.
4. **Data access → Add or remove scopes** → add `https://www.googleapis.com/auth/gmail.readonly` → **Save**.
5. **Audience → Test users → Add users** → add the Gmail address that receives your BAC emails.

> While the app is in *Testing* status, Google expires the Gmail token after 7 days, so you
> reconnect once a week. Publishing the app removes that limit but triggers Google's
> verification for sensitive scopes.

**3. Create the OAuth client**
1. **Credentials → Create credentials → OAuth client ID → Web application**.
2. Under **Authorized redirect URIs** add:
   - `http://localhost:3000/api/gmail/callback` (local)
   - `https://YOUR-APP.vercel.app/api/gmail/callback` (if you deploy; add it later)
3. **Create**, then copy the **Client ID** and **Client secret**.

**4. Put the keys in `.env.local`**

```bash
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
SESSION_SECRET=paste-the-output-of: openssl rand -base64 32
```

**5. Run and connect**
1. `npm run dev`, open <http://localhost:3000>, create an account.
2. **Settings → Connect Gmail**, accept the read-only permission.
3. Click **Sync now** to import recent BAC emails.

Optional: `GOOGLE_PLACES_API_KEY` (merchant lookup) and `AI_GATEWAY_API_KEY` (LLM
classification). Both cost money per request on your own account.

## Deploy your own copy to Vercel (step by step)

You need free accounts on [GitHub](https://github.com), [Vercel](https://vercel.com) and (through Vercel) [Neon](https://neon.tech).

**1. Fork and import**
1. Click **Fork** on this repository.
2. In Vercel: **Add New → Project** → pick your fork → **Import**. Do not deploy yet; if it
   deploys, that is fine, it just won't work until step 3.

**2. Create the database (Neon)**
1. In your Vercel project open **Storage → Create Database → Neon**.
2. Region: closest to you. Turn **Auth** off. Plan: **Free**. **Create**.
3. Leave *Production* and *Preview* selected, leave the prefix empty, **Connect Project**.
   This adds `DATABASE_URL` for you.

**3. Add the other variables** (Project → **Settings → Environment Variables**)

| Variable | Value |
| --- | --- |
| `SESSION_SECRET` | output of `openssl rand -base64 32` |
| `DEMO_ONLY` | `true` for a public demo (only the seeded demo account works). Leave unset for a private instance |

For a **private instance with your own Gmail**, also add `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `CRON_SECRET` (any long random string) and `APP_URL` (your Vercel URL).
Then add `APP_URL/api/gmail/callback` as a redirect URI in Google Cloud (see above).

**4. Deploy**
1. **Deployments → Redeploy** (or push a commit).
2. For a public demo, go to **Settings → Deployment Protection** and turn **Vercel
   Authentication** off, otherwise visitors must log in to Vercel.
3. Open your URL. The tables are created on first use.

## Privacy and security

- Gmail scope is `gmail.readonly` only, and tokens with any write scope are rejected.
- The app only searches for mail from `baccredomatic.com` and `notificacionesbaccr.com`.
- The Gmail refresh token is encrypted at rest (AES-256-GCM). Passwords are hashed with scrypt.
- All fixtures and demo data are synthetic.

## Known limitations

This is hackathon code that has been cleaned up, not a hardened product.

- Login has no rate limiting or account lockout.
- Tests cover the parser, ingest pipeline, and Gmail helpers. There are no UI or end-to-end tests.
- Only BAC Credomatic email formats are supported, and the UI is written Spanish-first.
- Gmail sync has not been proven end to end in production.
- The demo account is shared between visitors.

## License

[MIT](LICENSE)
