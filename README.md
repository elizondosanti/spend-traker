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

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local   # optional: the app runs without any variable
npm run dev
```

Open <http://localhost:3000> and choose the demo account. With no `DATABASE_URL`, data is
stored locally in `.data/` using PGlite. Outside Vercel, the home screen has a panel where you
can paste a BAC notification email to see it parsed and classified.

Other scripts:

```bash
npm test          # unit tests (parser, ingest, Gmail helpers, formatting)
npm run lint
npm run typecheck
npm run build
```

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

## Run it with your own data

By default everything stays on your machine. To make it read your own BAC emails, you bring
your own Google Cloud project. Nothing is shared with the author, and no credentials ship
with this repository.

1. **Google Cloud project.** In the [Google Cloud console](https://console.cloud.google.com/),
   create a project and enable the **Gmail API**.
2. **OAuth consent screen.** Choose *External*, add the scope
   `https://www.googleapis.com/auth/gmail.readonly`, and add your own Google account as a
   **test user**. Google expires refresh tokens after 7 days for apps in *Testing* status, so
   you will have to reconnect Gmail weekly unless you publish the app.
3. **OAuth client.** Create credentials of type *OAuth client ID* → *Web application*, with the
   authorized redirect URI `http://localhost:3000/api/gmail/callback`.
4. **Environment.** Put the client ID and secret in `.env.local`:

   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   SESSION_SECRET=$(openssl rand -base64 32)
   ```

5. **Run** `npm run dev`, create an account, and use *Connect Gmail* in Settings. Use
   *Sync now* to import recent BAC emails. The daily cron only exists on Vercel.

Optional: set `GOOGLE_PLACES_API_KEY` and `AI_GATEWAY_API_KEY` to enable merchant lookup and
LLM classification. Both cost money per request on your own account.

By default data lives in `.data/` (local PGlite). To use Postgres instead, create a free
[Neon](https://neon.tech) database and set `DATABASE_URL`.

## Deploy to Vercel

1. Import the repository in Vercel.
2. Set `SESSION_SECRET` and `DATABASE_URL` (a Postgres database is required: the local
   embedded one does not persist on Vercel).
3. For a **public demo**, also set `DEMO_ONLY=true` and leave the Google, Places, and AI
   variables empty. Visitors can only use the seeded demo account, so no personal data or
   paid API is exposed.
4. For your **own private instance**, set the Google variables, `CRON_SECRET`, and your
   production URL as `APP_URL`, and add that URL's `/api/gmail/callback` as a redirect URI in
   Google Cloud.

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
