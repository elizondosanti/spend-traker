import type { Lang } from "./i18n";

export function formatDate(value: string | Date, lang: Lang, withTime = false): string {
  return new Intl.DateTimeFormat(lang === "es" ? "es-CR" : "en-US", {
    day: "numeric",
    month: "short",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Costa_Rica",
  }).format(new Date(value));
}

export function formatMonth(month: string, lang: Lang): string {
  const label = new Intl.DateTimeFormat(lang === "es" ? "es-CR" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T12:00:00Z`));
  // es-CR yields "noviembre de 2026"; drop the "de" for a calmer title.
  const cleaned = label.replace(/\s+de\s+/i, " ");
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** `datetime-local` value in Costa Rica, which does not observe daylight saving. */
export function costaRicaInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Costa_Rica",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

export function parseCostaRicaInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(`${value}:00-06:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
