import type { Transaction } from "./data";
import { formatDate } from "./format";
import type { Lang, TKey } from "./i18n";
import { formatSignedMoney } from "./money";

const TRANSFER_KINDS = new Set(["sinpe", "sinpe_movil", "transferencia"]);

export type ConceptDisplay = { text: string; empty: boolean };

/** Concepto visible para confirmar: texto del correo, o “Sin descripción” en SINPE/transferencia. */
export function movementConceptDisplay(
  tx: Pick<Transaction, "kind" | "concept">,
  tr: (key: TKey) => string,
): ConceptDisplay | null {
  const concept = tx.concept?.trim() ?? "";
  if (concept) return { text: concept, empty: false };
  if (TRANSFER_KINDS.has(tx.kind)) return { text: tr("noConcept"), empty: true };
  return null;
}

export function movementConceptLabel(tx: Pick<Transaction, "kind" | "concept">, tr: (key: TKey) => string): string | null {
  return movementConceptDisplay(tx, tr)?.text ?? null;
}

export function movementFacts(tx: Transaction, lang: Lang, tr: (key: TKey) => string): { label: string; value: string }[] {
  const card = tx.card_last4
    ? `${tx.card_brand ?? ""} ····${tx.card_last4}${tx.card_nickname ? ` (${tx.card_nickname})` : ""}`.trim()
    : "";
  const source = tr(`src_${tx.source}` as TKey);
  const confidence = tx.confidence > 0 && tx.confidence < 1 ? ` · ${Math.round(tx.confidence * 100)}%` : "";
  const concept = movementConceptLabel(tx, tr) ?? "";
  const rows = [
    { label: tr("when"), value: formatDate(tx.occurred_at, lang, true) },
    { label: tr("movementType"), value: tr(tx.kind) },
    { label: tr("directionLabel"), value: tr(tx.direction) },
    { label: tr("concept"), value: concept },
    { label: tr("card"), value: card },
    { label: tr("place"), value: tx.city ?? "" },
    { label: tr("reference"), value: tx.bac_ref ?? "" },
    { label: tr("source"), value: `${source}${confidence}` },
  ];
  return rows.filter((row) => row.value.trim());
}

export function movementAmount(tx: Transaction, lang: Lang): string {
  return formatSignedMoney(tx.amount, tx.currency, tx.direction, lang);
}

export function movementMeta(tx: Transaction, lang: Lang, tr: (key: TKey) => string): string {
  const card = tx.card_last4 ? ` · ${tx.card_brand ?? ""} ${tx.card_last4}` : "";
  return `${formatDate(tx.occurred_at, lang, true)} · ${tr(tx.kind)}${card}`;
}
