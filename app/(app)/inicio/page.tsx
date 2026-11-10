import Link from "next/link";
import { after } from "next/server";
import { BudgetBar } from "@/components/BudgetBar";
import { OriginPanel } from "@/components/OriginPanel";
import { SimulatePanel, SyncButton } from "@/components/SimulatePanel";
import { countPendingReviews, currentMonth, getGmailConnection, listTransactions, monthSummary } from "@/lib/data";
import { formatDate, formatMonth, shiftMonth } from "@/lib/format";
import { syncGmailIfStale } from "@/lib/gmail";
import { translator } from "@/lib/i18n";
import { formatMoney, formatSignedMoney } from "@/lib/money";
import { movementAmount, movementConceptDisplay, movementFacts, movementMeta } from "@/lib/movement-view";
import { requireUser, uiLang } from "@/lib/session";

const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : "");

function inicioHref(month: string, cat?: string, mov?: string) {
  const params = new URLSearchParams({ mes: month });
  if (cat) params.set("cat", cat);
  if (mov) params.set("mov", mov);
  return `/inicio?${params.toString()}`;
}

export default async function Home({ searchParams }: PageProps<"/inicio">) {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const params = await searchParams;
  const mes = one(params.mes);
  const catId = one(params.cat);
  const movId = one(params.mov);
  const month = /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonth();

  const [summary, monthTxs, pending, gmail] = await Promise.all([
    monthSummary(user.id, month, user.fx_rate),
    listTransactions(user.id, { month, limit: 5000 }),
    countPendingReviews(user.id),
    getGmailConnection(user.id),
  ]);

  if (gmail) after(() => syncGmailIfStale(user.id));

  const recent = monthTxs.slice(0, 6);
  const category = summary.categories.find((c) => c.id === catId) ?? null;
  const categoryTxs = category ? monthTxs.filter((tx) => tx.category_id === category.id && tx.direction === "gasto") : [];
  const selectedTx = monthTxs.find((tx) => tx.id === movId) ?? null;
  const detailTx =
    selectedTx && category ? (selectedTx.category_id === category.id && selectedTx.direction === "gasto" ? selectedTx : null) : selectedTx;
  const closeHref = inicioHref(month);
  const money = (n: number, c: "CRC" | "USD") => formatMoney(n, c, lang);
  const left = { CRC: summary.budget.CRC - summary.spent.CRC, USD: summary.budget.USD - summary.spent.USD };
  const groups = (["bills", "needs", "wants"] as const).map((g) => ({
    g,
    cats: summary.categories.filter((c) => c.grp === g),
  }));
  const expenseCount = (id: string) => monthTxs.filter((tx) => tx.category_id === id && tx.direction === "gasto").length;

  return (
    <div className="page">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/inicio?mes=${shiftMonth(month, -1)}`} className="icon-btn" aria-label="Mes anterior">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M11.25 3.75 6 9l5.25 5.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="large-title">{formatMonth(month, lang)}</h1>
        <Link href={`/inicio?mes=${shiftMonth(month, 1)}`} className="icon-btn" aria-label="Mes siguiente">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M6.75 3.75 12 9l-5.25 5.25" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          title={left.CRC >= 0 ? tr("budgetLeft") : tr("overBudget")}
          main={money(Math.abs(left.CRC), "CRC")}
          sub={money(Math.abs(left.USD), "USD")}
          tone={left.CRC >= 0 ? "ok" : "bad"}
          lead
        />
        <Stat title={tr("spentThisMonth")} main={money(summary.spent.CRC, "CRC")} sub={money(summary.spent.USD, "USD")} />
        <Stat title={tr("incomeThisMonth")} main={money(summary.income.CRC, "CRC")} sub={money(summary.income.USD, "USD")} />
      </section>

      {pending > 0 && (
        <Link
          href="/avisos"
          className="flex items-center justify-between rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 hover:bg-amber-100"
        >
          <span>
            <strong>{pending}</strong> {tr("pendingReviews")}
          </span>
          <span className="font-semibold">{tr("goReview")} →</span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="space-y-4">
          {groups.map(({ g, cats }) => {
            const spent = cats.reduce((s, c) => s + (c.currency === "CRC" ? c.spent : c.spent * user.fx_rate), 0);
            const budget = cats.reduce((s, c) => s + (c.currency === "CRC" ? c.budget : c.budget * user.fx_rate), 0);
            return (
              <div key={g} className="card">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold">{tr(g)}</h2>
                  <span className="text-sm text-slate-600">
                    {money(spent, "CRC")} {tr("of")} {money(budget, "CRC")}
                  </span>
                </div>
                <ul className="space-y-1">
                  {cats.map((c) => {
                    const remaining = c.budget - c.spent;
                    const count = expenseCount(c.id);
                    const open = category?.id === c.id && !detailTx;
                    return (
                      <li key={c.id}>
                        <Link
                          href={open ? closeHref : inicioHref(month, c.id)}
                          aria-current={category?.id === c.id ? "true" : undefined}
                          className={`block rounded-xl px-2 py-2 hover:bg-brand-soft ${category?.id === c.id ? "row-active" : ""}`}
                        >
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                            <span className="min-w-0">
                              <span className="block font-medium">{c.name}</span>
                              <span className="text-xs text-slate-500">
                                {count} {count === 1 ? tr("movement") : tr("movements")}
                              </span>
                            </span>
                            <span className={`shrink-0 text-right ${remaining < 0 ? "font-semibold text-bad" : "text-slate-600"}`}>
                              {money(c.spent, c.currency)} / {c.budget > 0 ? money(c.budget, c.currency) : tr("noBudget")}
                              <span aria-hidden className="ml-1">
                                ›
                              </span>
                            </span>
                          </div>
                          {c.budget > 0 && <BudgetBar spent={c.spent} budget={c.budget} label={c.name} />}
                          {c.budget > 0 && (
                            <p className={`mt-1 text-xs ${remaining < 0 ? "text-bad" : "text-slate-500"}`}>
                              {money(Math.abs(remaining), c.currency)} {remaining < 0 ? tr("over") : tr("left")}
                            </p>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          {!process.env.VERCEL && (
            <SimulatePanel
              labels={{ title: tr("simulateTitle"), help: tr("simulateHelp"), button: tr("simulateButton"), paste: tr("pasteEmail") }}
            />
          )}
          {gmail && (
            <div className="card space-y-2">
              <p className="text-sm text-slate-600">
                Gmail · {gmail.email}
                <br />
                {tr("lastSync")}: {gmail.last_sync_at ? formatDate(gmail.last_sync_at, lang, true) : tr("never")}
              </p>
              <SyncButton label={tr("syncNow")} />
            </div>
          )}
          <div className="card">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">{tr("recent")}</h2>
              <Link href="/movimientos" className="text-sm text-brand hover:underline">
                {tr("seeAll")}
              </Link>
            </div>
            <ul className="divide-y divide-slate-100">
              {recent.length === 0 && <li className="py-2 text-sm text-slate-500">{tr("noTransactions")}</li>}
              {recent.map((tx) => (
                <li key={tx.id}>
                  <Link href={inicioHref(month, undefined, tx.id)} className="flex items-center justify-between gap-2 py-2 text-sm hover:opacity-80">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{tx.merchant}</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(tx.occurred_at, lang)} · {tr(tx.kind)}
                        {tx.card_last4 ? ` · ${tx.card_brand} ${tx.card_last4}` : ""}
                      </span>
                    </span>
                    <span
                      className={`num shrink-0 text-right font-semibold tabular-nums tracking-normal ${tx.direction === "ingreso" ? "text-ok" : "text-ink"}`}
                    >
                      {formatSignedMoney(tx.amount, tx.currency, tx.direction, lang)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid w-full grid-cols-2 gap-2">
            <Link href="/movimientos#agregar" className="btn">
              {tr("addExpense")}
            </Link>
            <Link href="/movimientos#ingreso" className="btn">
              {tr("addIncome")}
            </Link>
          </div>
        </aside>
      </div>

      {(category || detailTx) && (
        <OriginPanel
          closeHref={closeHref}
          backHref={category && detailTx ? inicioHref(month, category.id) : undefined}
          category={
            category
              ? {
                  name: category.name,
                  group: tr(category.grp),
                  spent: category.spent,
                  budget: category.budget,
                  total: money(category.spent, category.currency),
                  count: categoryTxs.length,
                }
              : undefined
          }
          rows={categoryTxs.map((tx) => {
            const concept = movementConceptDisplay(tx, tr);
            return {
              id: tx.id,
              href: inicioHref(month, category?.id, tx.id),
              merchant: tx.merchant,
              concept: concept && !concept.empty ? concept.text : null,
              meta: movementMeta(tx, lang, tr),
              amount: movementAmount(tx, lang),
              income: tx.direction === "ingreso",
            };
          })}
          detail={
            detailTx
              ? (() => {
                  const concept = movementConceptDisplay(detailTx, tr);
                  return {
                    merchant: detailTx.merchant,
                    concept: concept?.text ?? null,
                    conceptEmpty: concept?.empty,
                    amount: movementAmount(detailTx, lang),
                    income: detailTx.direction === "ingreso",
                    kind: tr(detailTx.kind),
                    rows: [
                      {
                        label: tr("category"),
                        value: summary.categories.find((c) => c.id === detailTx.category_id)?.name ?? tr("uncategorized"),
                      },
                      ...movementFacts(detailTx, lang, tr),
                    ],
                  };
                })()
              : undefined
          }
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

function Stat({ title, main, sub, tone, lead }: { title: string; main: string; sub: string; tone?: "ok" | "bad"; lead?: boolean }) {
  return (
    <div className={`card ${lead ? "card-lead" : ""}`}>
      <p className="eyebrow">{title}</p>
      <p
        className={`num-display mt-2 text-ink ${lead ? "text-[2.25rem]" : "text-[1.625rem]"} ${
          tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : ""
        }`}
      >
        {main}
      </p>
      <p className="mt-1.5 text-sm text-slate-500">{sub}</p>
    </div>
  );
}
