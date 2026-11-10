import { beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_EMAILS } from "@/lib/bac/samples";
import { listCategories, listPendingReviews, monthSummary } from "@/lib/data";
import { queryOne } from "@/lib/db";
import { ensureDemoUser } from "@/lib/demo";
import { ingestEmail, learn } from "@/lib/ingest";
import { createUser } from "@/lib/users";

const sample = (id: string) => SAMPLE_EMAILS.find((s) => s.id === id)!.text;
let userId: string;

beforeAll(async () => {
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL_OIDC_TOKEN;
  delete process.env.GOOGLE_PLACES_API_KEY;
  userId = await createUser({ email: `t${Date.now()}@x.com`, name: "T", passwordHash: null, lang: "es" });
});

describe("ingestEmail", () => {
  it("classifies a purchase by rules, asks once, then remembers", async () => {
    const first = await ingestEmail({ userId, text: sample("dunkin") });
    expect(first.status).toBe("created");
    if (first.status !== "created") return;
    expect(first.classification.source).toBe("reglas");
    const categories = await listCategories(userId);
    const restaurants = categories.find((c) => c.slug === "restaurants")!;
    expect(first.classification.categoryId).toBe(restaurants.id);
    expect((await listPendingReviews(userId)).map((r) => r.reason)).toContain("comercio_nuevo");

    await learn(userId, first.transactionId, restaurants.id);
    expect(await listPendingReviews(userId)).toHaveLength(0);

    const second = await ingestEmail({ userId, text: sample("dunkin"), simulate: true });
    expect(second.status === "created" && second.classification.source).toBe("memoria");
    expect(await listPendingReviews(userId)).toHaveLength(0);
  });

  it("never records the same BAC email twice", async () => {
    expect((await ingestEmail({ userId, text: sample("parquimetros"), gmailId: "a" })).status).toBe("created");
    expect((await ingestEmail({ userId, text: sample("parquimetros"), gmailId: "b" })).status).toBe("duplicate");
  });

  it("asks for a concept on a SINPE without description and learns it", async () => {
    const result = await ingestEmail({ userId, text: sample("sinpe-sin-descripcion") });
    expect(result.status === "created" && result.classification.reason).toBe("sinpe_sin_concepto");
    if (result.status !== "created") return;
    const groceries = (await listCategories(userId)).find((c) => c.slug === "groceries")!;
    await learn(userId, result.transactionId, groceries.id, "alimentación");
    const memory = await queryOne<{ category_id: string }>(
      "SELECT category_id FROM concept_memory WHERE user_id = $1 AND key = 'alimentacion'",
      [userId],
    );
    expect(memory?.category_id).toBe(groceries.id);
  });

  it("maps a concept that names a category, and services to bills", async () => {
    const concept = await ingestEmail({ userId, text: sample("sinpe-alimentacion") });
    const groceries = (await listCategories(userId)).find((c) => c.slug === "groceries")!;
    expect(concept.status === "created" && concept.classification.categoryId).toBe(groceries.id);

    const service = await ingestEmail({ userId, text: sample("municipalidad") });
    const utilities = (await listCategories(userId)).find((c) => c.slug === "utilities")!;
    expect(service.status === "created" && service.classification.categoryId).toBe(utilities.id);
  });

  it("rejects unrelated emails without an LLM", async () => {
    expect((await ingestEmail({ userId, text: "Promo BAC Foodies 30% de descuento" })).status).toBe("unrecognized");
  });
});

describe("demo account", () => {
  it("is seeded with a full month, warm memory and pending reviews", async () => {
    const demoId = await ensureDemoUser();
    expect(await ensureDemoUser()).toBe(demoId);
    const month = new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 7);
    const summary = await monthSummary(demoId, month, 505);
    expect(summary.spent.CRC).toBeGreaterThan(200000);
    expect(summary.income.CRC).toBeGreaterThan(600000);
    expect(summary.categories.some((c) => c.spent > 0 && c.slug === "restaurants")).toBe(true);
    const reasons = (await listPendingReviews(demoId)).map((r) => r.reason);
    expect(reasons).toContain("sinpe_sin_concepto");
    expect(reasons.length).toBeGreaterThanOrEqual(3);
  });
});
