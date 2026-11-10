# Security

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private
vulnerability reporting ("Security" tab, then "Report a vulnerability") on this repository.

## Secrets

- Never commit `.env`, `.env.local`, or real API keys. `.env.example` is a template only.
- Production secrets belong in the host's environment variables: `SESSION_SECRET`,
  `ENCRYPTION_KEY`, `CRON_SECRET`, Google OAuth credentials, AI Gateway key, `DATABASE_URL`.
- Gmail refresh tokens are stored encrypted at rest (AES-256-GCM).
- Outside production, a fixed development secret is used when `SESSION_SECRET` is unset.
  In production, signing or encrypting without `SESSION_SECRET` throws an error.

## Gmail access

- OAuth scope: `https://www.googleapis.com/auth/gmail.readonly` only. The app rejects
  tokens that include any write scope.
- The app never asks for bank credentials and cannot send, modify, or delete email.

## Public endpoints

- `GET /api/cron/gmail` requires `Authorization: Bearer $CRON_SECRET`.
- `/api/gmail/connect` and `/api/gmail/callback` are part of the authenticated OAuth flow.

## Test data

Fixtures in `lib/bac/samples.ts` and the demo seed data are synthetic: names, card endings,
account digits, and reference numbers are fictional. Do not add real bank emails or
personal data to this repository.
