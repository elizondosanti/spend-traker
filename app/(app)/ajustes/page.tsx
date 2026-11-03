import { resetDemoAction, updateCardAction, updateSettingsAction } from "@/app/actions";
import { GmailCard } from "@/components/GmailCard";
import { LangToggle } from "@/components/LangToggle";
import { getGmailConnection, listCards, memoryStats } from "@/lib/data";
import { appUrl, gmailConfigured } from "@/lib/gmail";
import { translator } from "@/lib/i18n";
import { requireUser, uiLang } from "@/lib/session";

export default async function Settings({ searchParams }: PageProps<"/ajustes">) {
  const user = await requireUser();
  const lang = await uiLang(user);
  const tr = translator(lang);
  const { gmail: gmailStatus } = await searchParams;
  const [connection, cards, stats] = await Promise.all([getGmailConnection(user.id), listCards(user.id), memoryStats(user.id)]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{tr("navSettings")}</h1>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">{tr("gmailTitle")}</h2>
        {gmailStatus === "error" && <p className="text-sm text-bad">Gmail: error al conectar / connection failed.</p>}
        {gmailStatus === "ok" && <p className="text-sm text-ok">✓ Gmail</p>}
        <GmailCard lang={lang} connection={connection} configured={gmailConfigured()} isDemo={user.is_demo} />
      </section>

      <section className="card grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">{tr("language")}</h2>
          <LangToggle lang={lang} tone="light" />
        </div>
        <form action={updateSettingsAction} className="space-y-2">
          <label className="block text-sm">
            <span className="mb-1 block font-semibold">{tr("fxRate")}</span>
            <input name="fx_rate" type="number" step="any" min={1} defaultValue={user.fx_rate} className="input" />
          </label>
          <p className="text-xs text-slate-500">{tr("fxHelp")}</p>
          <button className="btn-ghost">{tr("save")}</button>
        </form>
      </section>

      <section className="card space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{tr("cards")}</h2>
          <p className="text-sm text-slate-600">{tr("cardsHelp")}</p>
        </div>
        <ul className="space-y-2">
          {cards.map((c) => (
            <li key={c.id}>
              <form action={updateCardAction} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="cardId" value={c.id} />
                <span className="w-36 font-mono text-sm">
                  {c.brand} ····{c.last4}
                </span>
                <input name="nickname" defaultValue={c.nickname} placeholder={tr("nickname")} aria-label={tr("nickname")} className="input max-w-xs" />
                <button className="btn-ghost">{tr("save")}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2">
        <h2 className="text-lg font-semibold">{tr("forwardTitle")}</h2>
        <p className="text-sm text-slate-600">{tr("forwardHelp")}</p>
        <code className="block overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs">
          POST {appUrl()}/api/inbound/{user.is_demo ? "••••" : user.inbound_token}
        </code>
      </section>

      <section className="card grid gap-3 text-center sm:grid-cols-3">
        <div>
          <p className="text-2xl font-bold text-brand">{stats.merchants + stats.concepts}</p>
          <p className="text-sm text-slate-600">{tr("learned")}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-brand">{stats.tokens}</p>
          <p className="text-sm text-slate-600">{tr("tokens")}</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-brand">US${stats.costUsd.toFixed(4)}</p>
          <p className="text-sm text-slate-600">{tr("aiCost")}</p>
        </div>
      </section>

      {user.is_demo && (
        <form action={resetDemoAction}>
          <button className="btn-ghost">{tr("resetDemo")}</button>
        </form>
      )}
    </div>
  );
}
