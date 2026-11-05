import Link from "next/link";
import { CategoryPicker } from "@/components/CategoryPicker";
import { ManualExpenseForm } from "@/components/ManualExpenseForm";
import { OriginPanel } from "@/components/OriginPanel";
import { getTransaction, listCards, listCategories, listTransactions } from "@/lib/data";
import { costaRicaInputValue, formatDate } from "@/lib/format";
import { translator } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { movementAmount, movementFacts } from "@/lib/movement-view";
import { requireUser, uiLang } from "@/lib/session";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function movHref(
  filters: { q: string; cardId: string; kind: string; direction: string; sort: string },
  mov?: string,
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.cardId) params.set("tarjeta", filters.cardId);
  if (filters.kind) params.set("tipo", filters.kind);
  if (filters.direction) params.set("direccion", filters.direction);
  if (filters.sort && filters.sort !== "newest") params.set("orden", filters.sort);
  if (mov) params.set("mov", mov);
  const query = params.toString();
  return query ? `/movimientos?${query}` : "/movimientos";
}

export default async function Transactions({ searchParams }: PageProps<"/movimientos">) {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const params = await searchParams;
  const filters = {
    q: one(params.q),
    cardId: one(params.tarjeta),
    kind: one(params.tipo),
    direction: one(params.direccion),
    sort: one(params.orden) || "newest",
  };
  const movId = one(params.mov);

  const [transactions, categories, cards, selected] = await Promise.all([
    listTransactions(user.id, { ...filters, fxRate: user.fx_rate }),
    listCategories(user.id),
    listCards(user.id),
    movId ? getTransaction(user.id, movId) : Promise.resolve(null),
  ]);
  const options = categories.map((c) => ({ id: c.id, name: c.name, group: c.grp }));
  const groupLabels = { bills: tr("bills"), needs: tr("needs"), wants: tr("wants"), income: tr("income") };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{tr("navTransactions")}</h1>

      <ManualExpenseForm
        categories={categories.map((c) => ({ id: c.id, name: c.name, group: c.grp }))}
        cards={cards.map((c) => ({ id: c.id, label: `${c.brand} ····${c.last4}${c.nickname ? ` (${c.nickname})` : ""}` }))}
        groupLabels={{ bills: tr("bills"), needs: tr("needs"), wants: tr("wants"), income: tr("income") }}
        defaultWhen={costaRicaInputValue()}
        lang={lang}
        labels={{
          addExpense: tr("addExpense"),
          addIncome: tr("addIncome"),
          help: tr("addExpenseHelp"),
          incomeHelp: tr("addIncomeHelp"),
          name: tr("expenseName"),
          namePlaceholder: tr("expenseNamePlaceholder"),
          amount: tr("amount"),
          amountExample: tr("amountExample"),
          currency: tr("currency"),
          when: tr("when"),
          dateHint: tr("dateHint"),
          category: tr("category"),
          uncategorized: tr("uncategorized"),
          paidWith: tr("paidWith"),
          cash: tr("cash"),
          sinpeMovil: tr("sinpe_movil"),
          bankTransfer: tr("bankTransfer"),
          save: tr("save"),
        }}
      />

      <form method="get" className="card grid grid-cols-1 gap-2 sm:grid-cols-2" role="search">
        <input name="q" defaultValue={filters.q} placeholder={tr("search")} aria-label={tr("search")} className="input sm:col-span-2" />
        <select name="direccion" defaultValue={filters.direction} aria-label={tr("directionLabel")} className="input">
          <option value="">{tr("allMovements")}</option>
          <option value="gasto">{tr("gasto")}</option>
          <option value="ingreso">{tr("ingreso")}</option>
        </select>
        <select name="orden" defaultValue={filters.sort} aria-label={tr("sort")} className="input">
          <option value="newest">{tr("newest")}</option>
          <option value="oldest">{tr("oldest")}</option>
          <option value="amount_desc">{tr("amountDesc")}</option>
          <option value="amount_asc">{tr("amountAsc")}</option>
        </select>
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
          <option value="sinpe_movil">{tr("sinpe_movil")}</option>
          <option value="transferencia">{tr("transferencia")}</option>
          <option value="servicio">{tr("servicio")}</option>
          <option value="efectivo">{tr("efectivo")}</option>
        </select>
        <button className="btn sm:w-fit" aria-label={tr("search")}>
          🔍
        </button>
      </form>

      <ul className="space-y-2">
        {transactions.length === 0 && <li className="card text-slate-500">{tr("noTransactions")}</li>}
        {transactions.map((tx) => (
          <li key={tx.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link href={movHref(filters, tx.id)} className="min-w-0 flex-1 hover:opacity-80">
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
              </Link>
              <div className="text-right">
                <Link href={movHref(filters, tx.id)} className={`block text-lg font-bold hover:opacity-80 ${tx.direction === "ingreso" ? "text-ok" : ""}`}>
                  {tx.direction === "ingreso" ? "+" : "−"}
                  {formatMoney(tx.amount, tx.currency, lang)}
                </Link>
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
          </li>
        ))}
      </ul>
      {selected && (
        <OriginPanel
          closeHref={movHref(filters)}
          detail={{
            merchant: selected.merchant,
            amount: movementAmount(selected, lang),
            income: selected.direction === "ingreso",
            kind: tr(selected.kind),
            rows: [
              {
                label: tr("category"),
                value: categories.find((c) => c.id === selected.category_id)?.name ?? tr("uncategorized"),
              },
              ...movementFacts(selected, lang, tr),
            ],
          }}
          labels={{
            breakdown: tr("breakdown"),
            help: tr("breakdownHelp"),
            empty: tr("breakdownEmpty"),
            close: tr("close"),
            back: tr("backToBreakdown"),
            total: tr("total"),
            details: tr("details"),
          }}
        />
      )}
    </div>
  );
}
