export type Currency = "CRC" | "USD";

/** Accepts "10,300.00", "92.250,00", "3,00", "197,346.87", "960.00", "₡ 8.500". */
export function parseAmount(raw: string): number {
  let t = raw.replace(/[^\d.,]/g, "");
  if (!t) throw new Error(`Amount without digits: ${raw}`);
  if (t.includes(",") && t.includes(".")) {
    const decimal = t.lastIndexOf(",") > t.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    t = t.split(thousands).join("").replace(decimal, ".");
  } else if (t.includes(",")) {
    t = /,\d{2}$/.test(t) && t.split(",").length === 2 ? t.replace(",", ".") : t.split(",").join("");
  } else if (t.includes(".")) {
    if (/\.\d{3}$/.test(t) || t.split(".").length > 2) t = t.split(".").join("");
  }
  const value = Number(t);
  if (!Number.isFinite(value)) throw new Error(`Invalid amount: ${raw}`);
  return value;
}

export function parseCurrency(raw: string): Currency {
  const t = raw.toUpperCase();
  if (/USD|US\$|D[OÓ]LAR|\$/.test(t)) return "USD";
  if (/CRC|₡|COL[OÓ]N/.test(t)) return "CRC";
  throw new Error(`Unknown currency: ${raw}`);
}

export function convert(amount: number, from: Currency, to: Currency, fxRate: number): number {
  if (from === to) return amount;
  return from === "USD" ? amount * fxRate : amount / fxRate;
}

export function formatMoney(amount: number, currency: Currency, lang: "es" | "en" = "es"): string {
  return new Intl.NumberFormat(lang === "es" ? "es-CR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "CRC" ? 0 : 2,
  }).format(amount);
}
