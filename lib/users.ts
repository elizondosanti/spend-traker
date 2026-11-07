import { SEED_CATEGORIES } from "./categories";
import { newId, query, queryOne } from "./db";
import type { Lang } from "./i18n";

export type User = {
  id: string;
  email: string;
  name: string;
  lang: Lang;
  fx_rate: number;
  onboarded: boolean;
  is_demo: boolean;
};

export const DEMO_EMAIL = "demo@spendtraker.app";

export async function getUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT id, email, name, lang, fx_rate, onboarded, is_demo FROM users WHERE id = $1",
    [id],
  );
}

export async function seedCategories(userId: string, lang: Lang): Promise<void> {
  for (const [i, seed] of SEED_CATEGORIES.entries()) {
    await query(
      `INSERT INTO categories (id, user_id, name, slug, grp, budget, sort) VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id, name) DO NOTHING`,
      [newId(), userId, seed[lang], seed.slug, seed.grp, seed.budget, i],
    );
  }
}

export async function createUser(input: {
  email: string;
  name: string;
  passwordHash: string | null;
  lang: Lang;
  isDemo?: boolean;
}): Promise<string> {
  const id = newId();
  await query(
    "INSERT INTO users (id, email, name, password_hash, lang, is_demo, onboarded) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, input.email, input.name, input.passwordHash, input.lang, Boolean(input.isDemo), Boolean(input.isDemo)],
  );
  await seedCategories(id, input.lang);
  return id;
}
