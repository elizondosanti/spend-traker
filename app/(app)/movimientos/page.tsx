import { CategoryPicker } from "@/components/CategoryPicker";
import { listCards, listCategories, listTransactions } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { translator, type TKey } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { requireUser, uiLang } from "@/lib/session";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

export default async function Transactions({ searchParams }: PageProps<"/movimientos">) {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const params = await searchParams;
  const filters = { q: one(params.q), cardId: one(params.tarjeta), kind: one(params.tipo) };

  const [transactions, categories, cards] = await Promise.all([
    listTransactions(user.id, filters),
    listCategories(user.id),
    listCards(user.id),
  ]);
  const options = categories.map((c) => ({ id: c.id, name: c.name, group: c.grp }));
  const groupLabels = { bills: tr("bills"), needs: tr("needs"), wants: tr("wants"), income: tr("income") };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{tr("navTransactions")}</h1>

      <form className="card grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]" role="search">
        <input name="q" defaultValue={filters.q} placeholder={tr("search")} aria-label={tr("search")} className="input" />
        <select name="tarjeta" defaultValue={filters.cardId} aria-label={tr("card")} className="input">
          <option value="">{tr("allCards")}</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.brand} ····{c.last4}
              {c.nickname ? ` (${c.nickname})` : ""}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={filters.kind} aria-label={tr("allKinds")} className="input">
          <option value="">{tr("allKinds")}</option>
          <option value="compra">{tr("compra")}</option>
          <option value="sinpe">{tr("sinpe")}</option>
          <option value="servicio">{tr("servicio")}</option>
        </select>
        <button className="btn" aria-label={tr("search")}>
          🔍
        </button>
      </form>

      <ul className="space-y-2">
        {transactions.length === 0 && <li className="card text-slate-500">{tr("noTransactions")}</li>}
        {transactions.map((tx) => (
          <li key={tx.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{tx.merchant}</p>
                <p className="text-sm text-slate-500">
                  {formatDate(tx.occurred_at, lang, true)} ·{" "}
                  <span className="rounded bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">{tr(tx.kind)}</span>
                  {tx.card_last4 && (
                    <>
                      {" "}
                      · {tx.card_brand} ····{tx.card_last4}
                      {tx.card_nickname ? ` (${tx.card_nickname})` : ""}
                    </>
                  )}
                </p>
                {tx.concept && <p className="text-sm text-slate-600">“{tx.concept}”</p>}
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${tx.direction === "ingreso" ? "text-ok" : ""}`}>
                  {tx.direction === "ingreso" ? "+" : "−"}
                  {formatMoney(tx.amount, tx.currency, lang)}
                </p>
                <CategoryPicker
                  transactionId={tx.id}
                  value={tx.category_id}
                  options={options}
                  groupLabels={groupLabels}
                  label={tr("navCategories")}
                  placeholder={tr("uncategorized")}
                />
              </div>
            </div>
            <details className="mt-2 text-sm text-slate-600">
              <summary className="cursor-pointer text-brand">{tr("details")}</summary>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                <dt>{tr("source")}</dt>
                <dd>
                  {tr(`src_${tx.source}` as TKey)}
                  {tx.confidence > 0 && tx.confidence < 1 ? ` · ${Math.round(tx.confidence * 100)}%` : ""}
                </dd>
                <dt>{tr("tokens")}</dt>
                <dd>
                  {tx.tokens} · US${tx.cost_usd.toFixed(5)}
                </dd>
                {tx.city && (
                  <>
                    <dt>📍</dt>
                    <dd>{tx.city}</dd>
                  </>
                )}
                {tx.bac_ref && (
                  <>
                    <dt>{tr("reference")}</dt>
                    <dd className="font-mono text-xs">{tx.bac_ref}</dd>
                  </>
                )}
              </dl>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
