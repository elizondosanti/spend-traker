import { parseAmount, parseCurrency, type Currency } from "../money";

export type Kind = "compra" | "sinpe" | "servicio";
export type Direction = "gasto" | "ingreso";

export type ParsedEmail = {
  kind: Kind;
  direction: Direction;
  merchant: string;
  concept: string;
  city: string;
  amount: number;
  currency: Currency;
  occurredAt: string;
  cardBrand: string;
  cardLast4: string;
  ref: string;
};

const MONTHS: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const pad = (n: number | string) => String(n).padStart(2, "0");

/** BAC dates are Costa Rica local time (UTC-6, no DST). */
function iso(y: number, m: number, d: number, time = "12:00:00"): string {
  const [hh = "12", mm = "00", ss = "00"] = time.split(":");
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:${pad(ss.slice(0, 2))}-06:00`;
}

export function parseBacDate(raw: string): string {
  const t = raw.trim().toLowerCase();
  const time = t.match(/(\d{1,2}:\d{2}(?::\d{2})?)/)?.[1];
  let m = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return iso(+m[1], +m[2], +m[3], time);
  m = t.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return iso(+m[3], +m[2], +m[1], time);
  m = t.match(/([a-zé]{3})[a-zé]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (m && MONTHS[m[1]]) return iso(+m[3], MONTHS[m[1]], +m[2], time);
  m = t.match(/(\d{1,2})\s+(?:de\s+)?([a-zé]{3})[a-zé]*\.?\s+(?:de\s+)?(\d{4})/);
  if (m && MONTHS[m[2]]) return iso(+m[3], MONTHS[m[2]], +m[1], time);
  throw new Error(`Unknown date: ${raw}`);
}

/** Value of a "Label: value" line; empty values (e.g. "Referencia:") return "". */
function field(text: string, label: string): string {
  const m = text.match(new RegExp(`^\\s*${label}\\s*:[ \\t]*(.*)$`, "im"));
  return m ? m[1].trim() : "";
}

export function detectKind(text: string): Kind | null {
  if (/tipo de transacci[oó]n\s*:/i.test(text) || /notificaci[oó]n de transacci[oó]n/i.test(text)) return "compra";
  if (/pago de servicios?/i.test(text) && /monto\s*:/i.test(text)) return "servicio";
  if (/transferencia/i.test(text) && /por concepto de/i.test(text)) return "sinpe";
  return null;
}

function parseCompra(text: string): ParsedEmail | null {
  const merchant = field(text, "Comercio");
  const amountRaw = field(text, "Monto");
  const dateRaw = field(text, "Fecha");
  if (!merchant || !amountRaw || !dateRaw) return null;
  const card = text.match(/^\s*([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ .]{1,24}?)\s*:\s*\*{3,}\s*(\d{4})/m);
  const type = field(text, "Tipo de Transacci[oó]n").toUpperCase();
  const city = field(text, "Ciudad y pa[ií]s").replace(/^,\s*/, "");
  const ref = field(text, "Autorizaci[oó]n") || field(text, "Referencia");
  return {
    kind: "compra",
    direction: /DEVOLUCI|REVERS|ANULACI|CR[EÉ]DITO/.test(type) ? "ingreso" : "gasto",
    merchant,
    concept: "",
    city,
    amount: parseAmount(amountRaw),
    currency: parseCurrency(amountRaw),
    occurredAt: parseBacDate(dateRaw),
    cardBrand: card ? card[1].trim().toUpperCase() : "",
    cardLast4: card ? card[2] : "",
    ref: ref ? `${card?.[2] ?? ""}-${ref}` : "",
  };
}

function parseSinpe(text: string): ParsedEmail | null {
  const flat = text.replace(/\s+/g, " ");
  const amount = flat.match(/monto de\s*([\d.,]+)\s*(CRC|USD|colones|d[oó]lares)/i);
  const date = flat.match(/el d[ií]a\s*(\d{1,2}-\d{1,2}-\d{4})(?:\s*a las\s*(\d{1,2}:\d{2}(?::\d{2})?))?/i);
  if (!amount || !date) return null;
  const incoming = flat.match(/comunica que\s+(.+?)\s+realiz[oó] una transferencia.*?a su cuenta(?: N[°º.o]*)?\s*\*+\s*(\d{3,4})/i);
  const outgoing = flat.match(/(?:usted|se) realiz[oó] una transferencia.*?(?:a la cuenta de|a favor de|a)\s+(.+?)(?:\.|,| por un monto)/i);
  const conceptMatch = text.match(/por concepto de:?\s*\n?\s*([^\n]*?)\s*(?:\n|$)/i);
  let concept = (conceptMatch?.[1] ?? "").replace(/\s*El n[uú]mero de referencia.*$/i, "").trim();
  if (/^sin descripci[oó]n$/i.test(concept) || /^el n[uú]mero de referencia/i.test(concept)) concept = "";
  const ref = flat.match(/n[uú]mero de referencia es\s*(\d+)/i)?.[1] ?? "";
  return {
    kind: "sinpe",
    direction: incoming ? "ingreso" : "gasto",
    merchant: (incoming?.[1] ?? outgoing?.[1] ?? "Transferencia").trim(),
    concept,
    city: "",
    amount: parseAmount(amount[1]),
    currency: parseCurrency(amount[2]),
    occurredAt: parseBacDate(`${date[1]} ${date[2] ?? ""}`),
    cardBrand: incoming ? "CUENTA" : "",
    cardLast4: incoming?.[2]?.slice(-4) ?? "",
    ref,
  };
}

function parseServicio(text: string): ParsedEmail | null {
  const flat = text.replace(/\s+/g, " ");
  const service = flat.match(/pago de servicio de\s+(.+?)\s+desde\s+/i)?.[1]?.trim();
  const amountRaw = field(text, "Monto");
  const dateRaw = field(text, "Fecha de Pago") || field(text, "Fecha");
  if (!amountRaw || !dateRaw) return null;
  const alias = field(text, "Alias");
  const card = field(text, "Forma de Pago").match(/(\d{4})\s*$/)?.[1] ?? "";
  return {
    kind: "servicio",
    direction: "gasto",
    merchant: service || alias || "Pago de servicio",
    concept: alias,
    city: "",
    amount: parseAmount(amountRaw),
    currency: parseCurrency(amountRaw),
    occurredAt: parseBacDate(dateRaw),
    cardBrand: card ? "CUENTA" : "",
    cardLast4: card,
    ref: field(text, "N[uú]mero de Autorizaci[oó]n") || field(text, "N[uú]mero Referencia"),
  };
}

/** Regex parsing of the three real BAC formats. Returns null when the format is not recognized. */
export function parseBacEmail(text: string): ParsedEmail | null {
  try {
    switch (detectKind(text)) {
      case "compra":
        return parseCompra(text);
      case "sinpe":
        return parseSinpe(text);
      case "servicio":
        return parseServicio(text);
      default:
        return null;
    }
  } catch {
    return null;
  }
}

export const BAC_DOMAINS = ["baccredomatic.com", "notificacionesbaccr.com"];

export function isBacSender(from: string): boolean {
  const address = (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
  const domain = address.split("@")[1] ?? "";
  return BAC_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}
