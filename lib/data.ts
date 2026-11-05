import type { Group } from "./categories";
import { query, queryOne } from "./db";
import { convert, type Currency } from "./money";

export type Category = {
  id: string;
  name: string;
  slug: string | null;
  grp: Group;
  budget: number;
  currency: Currency;
  archived: boolean;
};

export type Card = { id: string; brand: string; last4: string; nickname: string };

export type Transaction = {
  id: string;
  kind: "compra" | "sinpe" | "servicio" | "efectivo" | "sinpe_movil" | "transferencia";
  direction: "gasto" | "ingreso";
  merchant: string;
  concept: string;
  city: string;
  amount: number;
  currency: Currency;
  occurred_at: string | Date;
  category_id: string | null;
  source: string;
  confidence: number;
  tokens: number;
  cost_usd: number;
  bac_ref: string;
  card_brand: string | null;
  card_last4: string | null;
  card_nickname: string | null;
};

export function currentMonth(): string {
  return new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 7);
}

export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [`${month}-01T00:00:00-06:00`, `${next}-01T00:00:00-06:00`];
}

export async function listCategories(userId: string, includeArchived = false): Promise<Category[]> {
  return query<Category>(
    `SELECT id, name, slug, grp, budget, currency, archived FROM categories
     WHERE user_id = $1 ${includeArchived ? "" : "AND archived = false"} ORDER BY sort, name`,
    [userId],
  );
}

export async function listCards(userId: string): Promise<Card[]> {
  return query<Card>("SELECT id, brand, last4, nickname FROM cards WHERE user_id = $1 ORDER BY brand, last4", [userId]);
}

const TX_SELECT = `SELECT t.id, t.kind, t.direction, t.merchant, t.concept, t.city, t.amount, t.currency, t.occurred_at,
  t.category_id, t.source, t.confidence, t.tokens, t.cost_usd, t.bac_ref,
  c.brand AS card_brand, c.last4 AS card_last4, c.nickname AS card_nickname
  FROM transactions t LEFT JOIN cards c ON c.id = t.card_id`;

export async function getTransaction(userId: string, id: string): Promise<Transaction | null> {
  return queryOne<Transaction>(`${TX_SELECT} WHERE t.user_id = $1 AND t.id = $2`, [userId, id]);
}

export async function listTransactions(
  userId: string,
  filters: {
    q?: string;
    cardId?: string;
    kind?: string;
    direction?: string;
    month?: string;
    sort?: string;
    fxRate?: number;
    limit?: number;
  } = {},
): Promise<Transaction[]> {
  const where = ["t.user_id = $1"];
  const params: unknown[] = [userId];
  if (filters.q) {
    params.push(`%${filters.q}%`);
    where.push(`(t.merchant ILIKE $${params.length} OR t.concept ILIKE $${params.length})`);
  }
  if (filters.cardId) {
    params.push(filters.cardId);
    where.push(`t.card_id = $${params.length}`);
  }
  if (filters.kind) {
    params.push(filters.kind);
    where.push(`t.kind = $${params.length}`);
  }
  if (filters.direction === "gasto" || filters.direction === "ingreso") {
    params.push(filters.direction);
    where.push(`t.direction = $${params.length}`);
  }
  if (filters.month) {
    const [start, end] = monthRange(filters.month);
    params.push(start, end);
    where.push(`t.occurred_at >= $${params.length - 1} AND t.occurred_at < $${params.length}`);
  }
  let order = "t.occurred_at DESC, t.created_at DESC";
  if (filters.sort === "oldest") order = "t.occurred_at ASC, t.created_at ASC";
  if (filters.sort === "amount_desc" || filters.sort === "amount_asc") {
    params.push(filters.fxRate && filters.fxRate > 0 ? filters.fxRate : 505);
    const money = `CASE WHEN t.currency = 'USD' THEN t.amount * $${params.length} ELSE t.amount END`;
    order = `${money} ${filters.sort === "amount_asc" ? "ASC" : "DESC"}, t.occurred_at DESC`;
  }
  params.push(filters.limit ?? 200);
  return query<Transaction>(`${TX_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT $${params.length}`, params);
}

export type CategorySummary = Category & { spent: number };

export type MonthSummary = {
  categories: CategorySummary[];
  spent: Record<Currency, number>;
  income: Record<Currency, number>;
  budget: Record<Currency, number>;
};

export async function monthSummary(userId: string, month: string, fxRate: number): Promise<MonthSummary> {
  const categories = await listCategories(userId);
  const txs = await listTransactions(userId, { month, limit: 5000 });
  const spentBy = new Map<string, number>();
  const totals = { spentCRC: 0, incomeCRC: 0 };

  for (const tx of txs) {
    const crc = convert(tx.amount, tx.currency, "CRC", fxRate);
    if (tx.direction === "ingreso") {
      totals.incomeCRC += crc;
      continue;
    }
    totals.spentCRC += crc;
    const category = categories.find((c) => c.id === tx.category_id);
    if (category) {
      spentBy.set(category.id, (spentBy.get(category.id) ?? 0) + convert(tx.amount, tx.currency, category.currency, fxRate));
    }
  }

  const budgetCRC = categories
    .filter((c) => c.grp !== "income")
    .reduce((sum, c) => sum + convert(c.budget, c.currency, "CRC", fxRate), 0);
  const both = (crc: number) => ({ CRC: crc, USD: convert(crc, "CRC", "USD", fxRate) });

  return {
    categories: categories.map((c) => ({ ...c, spent: spentBy.get(c.id) ?? 0 })),
    spent: both(totals.spentCRC),
    income: both(totals.incomeCRC),
    budget: both(budgetCRC),
  };
}

export type ReviewItem = { id: string; reason: string; transaction: Transaction };

export async function listPendingReviews(userId: string): Promise<ReviewItem[]> {
  const rows = await query<Transaction & { review_id: string; reason: string }>(
    `${TX_SELECT.replace("SELECT ", "SELECT r.id AS review_id, r.reason, ")}
     JOIN review_items r ON r.transaction_id = t.id
     WHERE r.user_id = $1 AND r.status = 'pending' ORDER BY t.occurred_at DESC`,
    [userId],
  );
  return rows.map(({ review_id, reason, ...transaction }) => ({ id: review_id, reason, transaction }));
}

export async function countPendingReviews(userId: string): Promise<number> {
  const row = await queryOne<{ n: number | string }>(
    "SELECT count(*) AS n FROM review_items WHERE user_id = $1 AND status = 'pending'",
    [userId],
  );
  return Number(row?.n ?? 0);
}

export type GmailConnection = { email: string; last_sync_at: string | Date | null; last_error: string };

export async function getGmailConnection(userId: string): Promise<GmailConnection | null> {
  return queryOne<GmailConnection>("SELECT email, last_sync_at, last_error FROM gmail_connections WHERE user_id = $1", [userId]);
}

export async function memoryStats(userId: string): Promise<{ merchants: number; concepts: number; tokens: number; costUsd: number }> {
  const row = await queryOne<{ merchants: string | number; concepts: string | number; tokens: string | number; cost: string | number }>(
    `SELECT (SELECT count(*) FROM merchant_memory WHERE user_id = $1) AS merchants,
            (SELECT count(*) FROM concept_memory WHERE user_id = $1) AS concepts,
            (SELECT coalesce(sum(tokens), 0) FROM transactions WHERE user_id = $1) AS tokens,
            (SELECT coalesce(sum(cost_usd), 0) FROM transactions WHERE user_id = $1) AS cost`,
    [userId],
  );
  return {
    merchants: Number(row?.merchants ?? 0),
    concepts: Number(row?.concepts ?? 0),
    tokens: Number(row?.tokens ?? 0),
    costUsd: Number(row?.cost ?? 0),
  };
}
