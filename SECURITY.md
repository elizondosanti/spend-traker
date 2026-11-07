# Security

## Reporting

If you find a vulnerability or exposed secret, open a private report with the repo owner. Do not open a public issue with credentials or personal data.

## Secrets

- Never commit `.env`, `.env.local`, or real API keys. Use `.env.example` as a template only.
- Production secrets live in the host (e.g. Vercel Environment Variables): `SESSION_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, Google OAuth, AI Gateway, `DATABASE_URL`.
- Gmail refresh tokens are stored encrypted at rest (`ENCRYPTION_KEY` / derived from `SESSION_SECRET`).

## Public endpoints

- `GET /api/cron/gmail` — requires `Authorization: Bearer $CRON_SECRET`.
- Gmail OAuth: `/api/gmail/connect` and `/api/gmail/callback` (authenticated user flow).

## Test data

Fixtures under `lib/bac/samples.ts` and demo seed data use **synthetic** names, card last-four digits, and references. Do not paste real bank emails or personal names into the repository.
