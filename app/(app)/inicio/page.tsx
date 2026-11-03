import Link from "next/link";
import { after } from "next/server";
import { BudgetBar } from "@/components/BudgetBar";
import { SimulatePanel, SyncButton } from "@/components/SimulatePanel";
import { SAMPLE_EMAILS } from "@/lib/bac/samples";
import { countPendingReviews, currentMonth, getGmailConnection, listTransactions, monthSummary } from "@/lib/data";
import { formatDate, formatMonth, shiftMonth } from "@/lib/format";
import { syncGmailIfStale } from "@/lib/gmail";
import { translator } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { requireUser, uiLang } from "@/lib/session";
export default async function Home({ searchParams }: PageProps<"/inicio">) {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const { mes } = await searchParams;
  const month = typeof mes === "string" && /^\d{4}-\d{2}$/.test(mes) ? mes : currentMonth();

  const [summary, recent, pending, gmail] = await Promise.all([
    monthSummary(user.id, month, user.fx_rate),
    listTransactions(user.id, { month, limit: 6 }),
    countPendingReviews(user.id),
    getGmailConnection(user.id),
  ]);

  // Vercel Hobby crons run daily, so opening the app also checks Gmail in the background.
  if (gmail) after(() => syncGmailIfStale(user.id));

  const left = { CRC: summary.budget.CRC - summary.spent.CRC, USD: summary.budget.USD - summary.spent.USD };
  const money = (n: number, c: "CRC" | "USD") => formatMoney(n, c, lang);
  const groups = (["bills", "needs", "wants"] as const).map((g) => {
    const cats = summary.categories.filter((c) => c.grp === g);
    return { g, cats };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href={`/inicio?mes=${shiftMonth(month, -1)}`} className="btn-ghost px-3" aria-label="←">
          ←
        </Link>
        <h1 className="text-xl font-bold">{formatMonth(month, lang)}</h1>
        <Link href={`/inicio?mes=${shiftMonth(month, 1)}`} className="btn-ghost px-3" aria-label="→">
          →
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat title={tr("spentThisMonth")} main={money(summary.spent.CRC, "CRC")} sub={money(summary.spent.USD, "USD")} />
        <Stat title={tr("incomeThisMonth")} main={money(summary.income.CRC, "CRC")} sub={money(summary.income.USD, "USD")} />
        <Stat
          title={left.CRC >= 0 ? tr("budgetLeft") : tr("overBudget")}
          main={money(Math.abs(left.CRC), "CRC")}
          sub={money(Math.abs(left.USD), "USD")}
          tone={left.CRC >= 0 ? "ok" : "bad"}
        />
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
                <ul className="space-y-3">
                  {cats.map((c) => {
                    const remaining = c.budget - c.spent;
                    return (
                      <li key={c.id}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                          <span className="font-medium">{c.name}</span>
                          <span className={remaining < 0 ? "font-semibold text-bad" : "text-slate-600"}>
                            {money(c.spent, c.currency)} / {c.budget > 0 ? money(c.budget, c.currency) : tr("noBudget")}
                          </span>
                        </div>
                        {c.budget > 0 && <BudgetBar spent={c.spent} budget={c.budget} label={c.name} />}
                        {c.budget > 0 && (
                          <p className={`mt-1 text-xs ${remaining < 0 ? "text-bad" : "text-slate-500"}`}>
                            {money(Math.abs(remaining), c.currency)} {remaining < 0 ? tr("over") : tr("left")}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <aside className="space-y-4">
          <SimulatePanel
            samples={SAMPLE_EMAILS.map(({ id, label }) => ({ id, label }))}
            labels={{ title: tr("simulateTitle"), help: tr("simulateHelp"), button: tr("simulateButton"), paste: tr("pasteEmail") }}
          />
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
                <li key={tx.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{tx.merchant}</span>
                    <span className="text-xs text-slate-500">
                      {formatDate(tx.occurred_at, lang)} · {tr(tx.kind)}
                      {tx.card_last4 ? ` · ${tx.card_brand} ${tx.card_last4}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-semibold ${tx.direction === "ingreso" ? "text-ok" : ""}`}>
                    {tx.direction === "ingreso" ? "+" : "−"}
                    {money(tx.amount, tx.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ title, main, sub, tone }: { title: string; main: string; sub: string; tone?: "ok" | "bad" }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-600">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${tone === "bad" ? "text-bad" : tone === "ok" ? "text-ok" : ""}`}>{main}</p>
      <p className="text-sm text-slate-500">{sub}</p>
    </div>
  );
}
