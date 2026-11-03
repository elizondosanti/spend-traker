import { neon } from "@neondatabase/serverless";

type Row = Record<string, unknown>;
type Runner = (text: string, params?: unknown[]) => Promise<Row[]>;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text NOT NULL DEFAULT '',
  password_hash text,
  lang text NOT NULL DEFAULT 'es',
  fx_rate double precision NOT NULL DEFAULT 505,
  onboarded boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  inbound_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  grp text NOT NULL,
  budget double precision NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'CRC',
  archived boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, name)
);
CREATE TABLE IF NOT EXISTS cards (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  brand text NOT NULL,
  last4 text NOT NULL,
  nickname text NOT NULL DEFAULT '',
  UNIQUE (user_id, brand, last4)
);
CREATE TABLE IF NOT EXISTS transactions (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  direction text NOT NULL,
  merchant text NOT NULL,
  concept text NOT NULL DEFAULT '',
  city text NOT NULL DEFAULT '',
  amount double precision NOT NULL,
  currency text NOT NULL,
  occurred_at timestamptz NOT NULL,
  card_id text REFERENCES cards(id) ON DELETE SET NULL,
  category_id text REFERENCES categories(id) ON DELETE SET NULL,
  source text NOT NULL,
  confidence double precision NOT NULL DEFAULT 0,
  tokens integer NOT NULL DEFAULT 0,
  cost_usd double precision NOT NULL DEFAULT 0,
  gmail_id text,
  bac_ref text NOT NULL DEFAULT '',
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS transactions_user_date ON transactions (user_id, occurred_at DESC);
CREATE TABLE IF NOT EXISTS merchant_memory (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS concept_memory (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL,
  category_id text NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  hits integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, key)
);
CREATE TABLE IF NOT EXISTS review_items (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id text NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS gmail_connections (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  refresh_token_enc text NOT NULL,
  last_sync_at timestamptz,
  last_error text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS processed_emails (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gmail_id text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, gmail_id)
)
`;

const globalForDb = globalThis as unknown as {
  __stRunner?: Promise<Runner>;
};

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = neon(url);
    return (text, params = []) => sql.query(text, params) as Promise<Row[]>;
  }
  // Local development without Neon: embedded Postgres persisted on disk.
  const { PGlite } = await import("@electric-sql/pglite");
  const dataDir = process.env.PGLITE_DIR === "memory" ? undefined : (process.env.PGLITE_DIR ?? ".data/pglite");
  if (dataDir) {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(dataDir, { recursive: true });
  }
  const pg = new PGlite(dataDir);
  return async (text, params = []) => (await pg.query<Row>(text, params)).rows;
}

async function init(): Promise<Runner> {
  const run = await createRunner();
  for (const statement of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) {
    await run(statement);
  }
  return run;
}

function runner(): Promise<Runner> {
  globalForDb.__stRunner ??= init().catch((error) => {
    globalForDb.__stRunner = undefined;
    throw error;
  });
  return globalForDb.__stRunner;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  const run = await runner();
  return (await run(text, params)) as T[];
}

export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export function newId(): string {
  return crypto.randomUUID();
}
