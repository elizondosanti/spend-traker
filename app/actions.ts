"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SAMPLE_EMAILS } from "@/lib/bac/samples";
import { GROUPS, SEED_CATEGORIES, type Group } from "@/lib/categories";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { newId, query, queryOne } from "@/lib/db";
import { ensureDemoUser, resetDemo } from "@/lib/demo";
import { disconnectGmail, syncGmail } from "@/lib/gmail";
import { t, type Lang } from "@/lib/i18n";
import { ingestEmail, learn } from "@/lib/ingest";
import { cookieLang, currentUser, endSession, requireUser, setCookieLang, startSession, uiLang } from "@/lib/session";
import { createUser } from "@/lib/users";

export type FormState = { error?: string; message?: string } | undefined;

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const asLang = (value: string): Lang => (value === "en" ? "en" : "es");
const asGroup = (value: string): Group => (GROUPS.includes(value as Group) ? (value as Group) : "wants");
const asCurrency = (value: string) => (value === "USD" ? "USD" : "CRC");

function revalidateApp() {
  for (const path of ["/inicio", "/movimientos", "/categorias", "/avisos", "/ajustes"]) revalidatePath(path);
}

// ---- Session ----

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const lang = await cookieLang();
  const user = await queryOne<{ id: string; password_hash: string | null; onboarded: boolean }>(
    "SELECT id, password_hash, onboarded FROM users WHERE email = $1 AND is_demo = false",
    [str(form, "email").toLowerCase()],
  );
  if (!user || !verifyPassword(str(form, "password"), user.password_hash)) return { error: t(lang, "invalidLogin") };
  await startSession(user.id);
  redirect(user.onboarded ? "/inicio" : "/bienvenida");
}

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const lang = await cookieLang();
  const email = str(form, "email").toLowerCase();
  const password = str(form, "password");
  if (password.length < 8) return { error: t(lang, "passwordShort") };
  if (await queryOne("SELECT 1 FROM users WHERE email = $1", [email])) return { error: t(lang, "emailTaken") };
  const userId = await createUser({ email, name: str(form, "name"), passwordHash: hashPassword(password), lang });
  await startSession(userId);
  redirect("/bienvenida");
}

export async function demoAction(): Promise<void> {
  await startSession(await ensureDemoUser());
  redirect("/inicio");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/");
}

export async function setLangAction(form: FormData): Promise<void> {
  const lang = asLang(str(form, "lang"));
  await setCookieLang(lang);
  const user = await currentUser();
  if (user && !user.is_demo) {
    await query("UPDATE users SET lang = $1 WHERE id = $2", [lang, user.id]);
    if (!user.onboarded) {
      // Starter categories follow the language picked during onboarding.
      for (const seed of SEED_CATEGORIES) {
        await query(
          "UPDATE categories SET name = $1 WHERE user_id = $2 AND slug = $3 AND name = $4",
          [seed[lang], user.id, seed.slug, seed[lang === "es" ? "en" : "es"]],
        );
      }
    }
  }
  const back = str(form, "redirectTo");
  if (back.startsWith("/")) redirect(back);
  revalidatePath("/", "layout");
}

// ---- Onboarding & settings ----

export async function finishOnboardingAction(): Promise<void> {
  const user = await requireUser();
  await query("UPDATE users SET onboarded = true WHERE id = $1", [user.id]);
  redirect("/inicio");
}

export async function updateSettingsAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const fx = Number(str(form, "fx_rate").replace(",", "."));
  if (fx > 0 && fx < 10000) await query("UPDATE users SET fx_rate = $1 WHERE id = $2", [fx, user.id]);
  revalidateApp();
}

export async function updateCardAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await query("UPDATE cards SET nickname = $1 WHERE id = $2 AND user_id = $3", [str(form, "nickname").slice(0, 40), str(form, "cardId"), user.id]);
  revalidateApp();
}

export async function disconnectGmailAction(): Promise<void> {
  const user = await requireUser();
  await disconnectGmail(user.id);
  revalidateApp();
}

export async function syncGmailAction(): Promise<FormState> {
  const user = await requireUser();
  try {
    const result = await syncGmail(user.id);
    revalidateApp();
    return { message: `Gmail: ${result.created} nuevos / ${result.checked} revisados` };
  } catch (error) {
    return { error: String(error).slice(0, 200) };
  }
}

export async function resetDemoAction(): Promise<void> {
  const user = await requireUser();
  if (user.is_demo) await resetDemo(user.id);
  revalidateApp();
}

// ---- Movements ----

export async function simulateAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const pasted = str(form, "text");
  const sample = SAMPLE_EMAILS.find((s) => s.id === str(form, "sampleId"));
  const text = pasted || sample?.text;
  if (!text) return { error: "—" };
  const result = await ingestEmail({ userId: user.id, text, simulate: true });
  revalidateApp();
  if (result.status !== "created") return { error: result.status };
  const tx = await queryOne<{ merchant: string; name: string | null }>(
    "SELECT t.merchant, c.name FROM transactions t LEFT JOIN categories c ON c.id = t.category_id WHERE t.id = $1",
    [result.transactionId],
  );
  const lang = await uiLang(user);
  const src = t(lang, `src_${result.classification.source}` as Parameters<typeof t>[1]);
  return { message: `${tx?.merchant} → ${tx?.name ?? t(lang, "uncategorized")} · ${src}` };
}

async function findOrCreateCategory(userId: string, form: FormData, direction: string): Promise<string | null> {
  const newName = str(form, "newCategory").slice(0, 40);
  if (!newName) return str(form, "categoryId") || null;
  const existing = await queryOne<{ id: string }>(
    "SELECT id FROM categories WHERE user_id = $1 AND lower(name) = lower($2)",
    [userId, newName],
  );
  if (existing) {
    await query("UPDATE categories SET archived = false WHERE id = $1", [existing.id]);
    return existing.id;
  }
  const id = newId();
  await query(
    "INSERT INTO categories (id, user_id, name, grp, budget, sort) VALUES ($1, $2, $3, $4, 0, 100)",
    [id, userId, newName, direction === "ingreso" ? "income" : "wants"],
  );
  return id;
}

export async function categorizeAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const transactionId = str(form, "transactionId");
  const tx = await queryOne<{ direction: string }>("SELECT direction FROM transactions WHERE id = $1 AND user_id = $2", [transactionId, user.id]);
  if (!tx) return;
  const categoryId = await findOrCreateCategory(user.id, form, tx.direction);
  if (categoryId) await learn(user.id, transactionId, categoryId, str(form, "concept") || undefined);
  revalidateApp();
}

// ---- Categories ----

export async function createCategoryAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const name = str(form, "name").slice(0, 40);
  if (!name) return;
  await query(
    `INSERT INTO categories (id, user_id, name, grp, budget, currency, sort) VALUES ($1,$2,$3,$4,$5,$6,100)
     ON CONFLICT (user_id, name) DO UPDATE SET archived = false`,
    [newId(), user.id, name, asGroup(str(form, "grp")), Math.max(0, Number(str(form, "budget")) || 0), asCurrency(str(form, "currency"))],
  );
  revalidateApp();
}

export async function updateCategoryAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const name = str(form, "name").slice(0, 40);
  if (!name) return;
  await query(
    "UPDATE categories SET name = $1, grp = $2, budget = $3, currency = $4 WHERE id = $5 AND user_id = $6",
    [name, asGroup(str(form, "grp")), Math.max(0, Number(str(form, "budget")) || 0), asCurrency(str(form, "currency")), str(form, "id"), user.id],
  ).catch(() => null);
  revalidateApp();
}

export async function archiveCategoryAction(form: FormData): Promise<void> {
  const user = await requireUser();
  await query("UPDATE categories SET archived = true WHERE id = $1 AND user_id = $2", [str(form, "id"), user.id]);
  revalidateApp();
}
