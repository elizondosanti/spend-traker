import { createHash } from "node:crypto";
import { parseBacEmail, type ParsedEmail } from "./bac/parse";
import { matchKeywords, matchPlaceTypes } from "./categories";
import { newId, query, queryOne } from "./db";
import { classifyWithLlm, extractWithLlm } from "./llm";
import { lookupPlace } from "./places";
import { normalizeKey } from "./text";

export type Source = "memoria" | "reglas" | "places" | "llm" | "manual" | "pendiente";

type CategoryRow = { id: string; name: string; slug: string | null; grp: string };

type Classification = {
  categoryId: string | null;
  source: Source;
  confidence: number;
  tokens: number;
  costUsd: number;
  reason: "comercio_nuevo" | "sinpe_sin_concepto" | "duda" | null;
};

async function activeCategories(userId: string): Promise<CategoryRow[]> {
  return query<CategoryRow>(
    "SELECT id, name, slug, grp FROM categories WHERE user_id = $1 AND archived = false ORDER BY sort",
    [userId],
  );
}

function bySlug(categories: CategoryRow[], slug: string | null): CategoryRow | undefined {
  return slug ? categories.find((c) => c.slug === slug) : undefined;
}

/** A transfer concept like "Categoria_alimentacion" may literally name one of the user's categories. */
function byNameInText(categories: CategoryRow[], text: string): CategoryRow | undefined {
  const key = ` ${normalizeKey(text)} `;
  return categories.find((c) => normalizeKey(c.name).length > 2 && key.includes(` ${normalizeKey(c.name)} `));
}

export async function classify(userId: string, tx: ParsedEmail): Promise<Classification> {
  const categories = await activeCategories(userId);
  const none = { tokens: 0, costUsd: 0 };
  const fallback = bySlug(categories, tx.direction === "ingreso" ? "income" : "other") ?? categories[0];

  if (tx.kind === "sinpe") {
    if (!tx.concept) {
      return { categoryId: fallback?.id ?? null, source: "pendiente", confidence: 0, ...none, reason: "sinpe_sin_concepto" };
    }
    const remembered = await queryOne<{ category_id: string }>(
      "SELECT category_id FROM concept_memory WHERE user_id = $1 AND key = $2",
      [userId, normalizeKey(tx.concept)],
    );
    if (remembered) return { categoryId: remembered.category_id, source: "memoria", confidence: 1, ...none, reason: null };
    const named = byNameInText(categories, tx.concept) ?? bySlug(categories, matchKeywords(tx.concept));
    if (named) return { categoryId: named.id, source: "reglas", confidence: 0.85, ...none, reason: "comercio_nuevo" };
  } else {
    const remembered = await queryOne<{ category_id: string }>(
      "SELECT category_id FROM merchant_memory WHERE user_id = $1 AND key = $2",
      [userId, normalizeKey(tx.merchant)],
    );
    if (remembered) return { categoryId: remembered.category_id, source: "memoria", confidence: 1, ...none, reason: null };
    const rule = bySlug(categories, tx.kind === "servicio" ? (matchKeywords(tx.merchant) ?? "utilities") : matchKeywords(tx.merchant));
    if (rule) return { categoryId: rule.id, source: "reglas", confidence: 0.85, ...none, reason: "comercio_nuevo" };
  }

  const place = tx.kind === "compra" ? await lookupPlace(tx.merchant, tx.city) : null;
  const llm = await classifyWithLlm({
    merchant: tx.merchant,
    city: tx.city,
    concept: tx.concept,
    kind: tx.kind,
    direction: tx.direction,
    place,
    categories: categories.map((c) => c.name),
  });
  if (llm) {
    const category = categories.find((c) => c.name === llm.category);
    return {
      categoryId: category?.id ?? fallback?.id ?? null,
      source: place ? "places" : "llm",
      confidence: llm.confidence,
      tokens: llm.tokens,
      costUsd: llm.costUsd,
      reason: llm.confidence >= 0.8 ? "comercio_nuevo" : "duda",
    };
  }
  const byPlace = place ? bySlug(categories, matchPlaceTypes(place.types)) : undefined;
  if (byPlace) return { categoryId: byPlace.id, source: "places", confidence: 0.7, ...none, reason: "comercio_nuevo" };
  return { categoryId: fallback?.id ?? null, source: "pendiente", confidence: 0.2, ...none, reason: "duda" };
}

async function upsertCard(userId: string, brand: string, last4: string): Promise<string | null> {
  if (!last4) return null;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO cards (id, user_id, brand, last4) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, brand, last4) DO UPDATE SET brand = EXCLUDED.brand
     RETURNING id`,
    [newId(), userId, brand || "TARJETA", last4],
  );
  return row?.id ?? null;
}

export type IngestResult =
  | { status: "created"; transactionId: string; parsedWith: "regex" | "llm"; classification: Classification }
  | { status: "duplicate" }
  | { status: "unrecognized" };

export async function ingestEmail(input: {
  userId: string;
  text: string;
  gmailId?: string;
  /** Simulation: pretend the movement happened now and allow repeating the same sample. */
  simulate?: boolean;
}): Promise<IngestResult> {
  let parsed: ParsedEmail | null = parseBacEmail(input.text);
  let parsedWith: "regex" | "llm" = "regex";
  let extractionUsage = { tokens: 0, costUsd: 0 };
  if (!parsed) {
    const viaLlm = await extractWithLlm(input.text);
    if (!viaLlm) return { status: "unrecognized" };
    const { tokens, costUsd, ...rest } = viaLlm;
    parsed = rest;
    parsedWith = "llm";
    extractionUsage = { tokens, costUsd };
  }

  if (input.simulate) {
    parsed = { ...parsed, occurredAt: new Date().toISOString(), ref: `${parsed.ref || "sim"}-sim-${Date.now()}` };
  }

  const dedupeKey = parsed.ref
    ? `${parsed.kind}:${parsed.ref}`
    : input.gmailId
      ? `gmail:${input.gmailId}`
      : `hash:${createHash("sha256").update(input.text).digest("hex").slice(0, 24)}`;

  const existing = await queryOne("SELECT 1 FROM transactions WHERE user_id = $1 AND dedupe_key = $2", [input.userId, dedupeKey]);
  if (existing) return { status: "duplicate" };

  const classification = await classify(input.userId, parsed);
  const cardId = await upsertCard(input.userId, parsed.cardBrand, parsed.cardLast4);
  const id = newId();
  const inserted = await queryOne<{ id: string }>(
    `INSERT INTO transactions
      (id, user_id, kind, direction, merchant, concept, city, amount, currency, occurred_at, card_id,
       category_id, source, confidence, tokens, cost_usd, gmail_id, bac_ref, dedupe_key)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (user_id, dedupe_key) DO NOTHING
     RETURNING id`,
    [
      id, input.userId, parsed.kind, parsed.direction, parsed.merchant, parsed.concept, parsed.city,
      parsed.amount, parsed.currency, parsed.occurredAt, cardId, classification.categoryId, classification.source,
      classification.confidence, classification.tokens + extractionUsage.tokens,
      classification.costUsd + extractionUsage.costUsd, input.gmailId ?? null, parsed.ref, dedupeKey,
    ],
  );
  if (!inserted) return { status: "duplicate" };

  if (classification.reason) {
    await query("INSERT INTO review_items (id, user_id, transaction_id, reason) VALUES ($1, $2, $3, $4)", [
      newId(), input.userId, id, classification.reason,
    ]);
  }
  return { status: "created", transactionId: id, parsedWith, classification };
}

/** Confirmed or corrected category: remember it so the same merchant or concept never costs tokens again. */
export async function learn(userId: string, transactionId: string, categoryId: string, concept?: string): Promise<void> {
  const tx = await queryOne<{ kind: string; merchant: string; concept: string }>(
    "SELECT kind, merchant, concept FROM transactions WHERE id = $1 AND user_id = $2",
    [transactionId, userId],
  );
  if (!tx) return;
  const finalConcept = concept?.trim() || tx.concept;
  await query(
    "UPDATE transactions SET category_id = $1, concept = $2, source = CASE WHEN source = 'memoria' THEN source ELSE 'manual' END, confidence = 1 WHERE id = $3 AND user_id = $4",
    [categoryId, finalConcept, transactionId, userId],
  );
  const [table, key] =
    tx.kind === "sinpe" ? ["concept_memory", normalizeKey(finalConcept)] : ["merchant_memory", normalizeKey(tx.merchant)];
  if (!key) return;
  await query(
    `INSERT INTO ${table} (user_id, key, category_id, hits) VALUES ($1, $2, $3, 1)
     ON CONFLICT (user_id, key) DO UPDATE SET category_id = EXCLUDED.category_id, hits = ${table}.hits + 1`,
    [userId, key, categoryId],
  );
  await query("UPDATE review_items SET status = 'resolved' WHERE transaction_id = $1 AND user_id = $2", [transactionId, userId]);
}
