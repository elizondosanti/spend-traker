import { generateText, Output } from "ai";
import { z } from "zod";
import type { ParsedEmail } from "./bac/parse";
import type { PlaceInfo } from "./places";

const MODEL = process.env.AI_MODEL ?? "google/gemini-2.5-flash";
// USD per million tokens, used only for the per-transaction cost estimate shown in the app.
const PRICE_IN = Number(process.env.AI_PRICE_IN ?? 0.3);
const PRICE_OUT = Number(process.env.AI_PRICE_OUT ?? 2.5);

export type LlmUsage = { tokens: number; costUsd: number };

export function llmEnabled(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

function usageOf(usage: { inputTokens?: number; outputTokens?: number } | undefined): LlmUsage {
  const input = usage?.inputTokens ?? 0;
  const output = usage?.outputTokens ?? 0;
  return { tokens: input + output, costUsd: (input * PRICE_IN + output * PRICE_OUT) / 1_000_000 };
}

export async function classifyWithLlm(input: {
  merchant: string;
  city: string;
  concept: string;
  kind: string;
  direction: string;
  place: PlaceInfo | null;
  categories: string[];
}): Promise<({ category: string; confidence: number } & LlmUsage) | null> {
  if (!llmEnabled()) return null;
  try {
    const { output, usage } = await generateText({
      model: MODEL,
      output: Output.object({
        schema: z.object({
          category: z.string().describe("Exactly one of the allowed category names"),
          confidence: z.number().min(0).max(1),
        }),
      }),
      prompt: `Clasificá este movimiento bancario de Costa Rica (BAC Credomatic) en UNA de estas categorías del usuario:
${input.categories.map((c) => `- ${c}`).join("\n")}

Tipo: ${input.kind} (${input.direction})
Comercio o contraparte: ${input.merchant}
Ciudad: ${input.city || "desconocida"}
Concepto escrito por el usuario: ${input.concept || "(ninguno)"}
Google Maps: ${input.place ? `${input.place.name} — ${input.place.types.join(", ")} — ${input.place.address}` : "(sin resultado)"}

Respondé con el nombre exacto de la categoría y tu confianza de 0 a 1.`,
    });
    if (!input.categories.includes(output.category)) return null;
    return { ...output, ...usageOf(usage) };
  } catch (error) {
    console.error("classifyWithLlm failed", error);
    return null;
  }
}

/** Fallback when the regex parsers don't recognize a BAC email layout. */
export async function extractWithLlm(text: string): Promise<(ParsedEmail & LlmUsage) | null> {
  if (!llmEnabled()) return null;
  try {
    const { output, usage } = await generateText({
      model: MODEL,
      output: Output.object({
        schema: z.object({
          isMovement: z.boolean(),
          kind: z.enum(["compra", "sinpe", "servicio"]),
          direction: z.enum(["gasto", "ingreso"]),
          merchant: z.string(),
          concept: z.string(),
          city: z.string(),
          amount: z.number(),
          currency: z.enum(["CRC", "USD"]),
          date: z.string().describe("YYYY-MM-DDTHH:mm:ss in Costa Rica local time"),
          cardBrand: z.string(),
          cardLast4: z.string(),
          ref: z.string().describe("Authorization or reference number"),
        }),
      }),
      prompt: `Extraé el movimiento de este correo del BAC Credomatic (Costa Rica). Si no es una compra, transferencia o pago, isMovement=false.\n---\n${text.slice(0, 6000)}\n---`,
    });
    if (!output.isMovement || !(output.amount > 0)) return null;
    const { date, kind, direction, merchant, concept, city, amount, currency, cardBrand, cardLast4, ref } = output;
    const rest = { kind, direction, merchant, concept, city, amount, currency, cardBrand, cardLast4, ref };
    return {
      ...rest,
      cardLast4: rest.cardLast4.slice(-4),
      occurredAt: `${date.length === 10 ? `${date}T12:00:00` : date.slice(0, 19)}-06:00`,
      ...usageOf(usage),
    };
  } catch (error) {
    console.error("extractWithLlm failed", error);
    return null;
  }
}
