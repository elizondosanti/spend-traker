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
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
