import { disconnectGmailAction } from "@/app/actions";
import { SyncButton } from "@/components/SimulatePanel";
import type { GmailConnection } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { translator, type Lang } from "@/lib/i18n";

export function TrustList({ lang }: { lang: Lang }) {
  const tr = translator(lang);
  return (
    <div className="rounded-xl bg-brand-soft p-4">
      <h3 className="mb-2 font-semibold text-brand">{tr("trustTitle")}</h3>
      <ul className="space-y-1.5 text-sm">
        {(["trust1", "trust2", "trust3", "trust4"] as const).map((k) => (
          <li key={k} className="flex gap-2">
            <span aria-hidden className="text-ok">
              ✓
            </span>
            {tr(k)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GmailCard({
  lang,
  connection,
  configured,
  isDemo,
}: {
  lang: Lang;
  connection: GmailConnection | null;
  configured: boolean;
  isDemo: boolean;
}) {
  const tr = translator(lang);
  return (
    <div className="space-y-4">
      <TrustList lang={lang} />
      {isDemo ? (
        <p className="text-sm text-slate-600">{tr("gmailDemo")}</p>
      ) : connection ? (
        <div className="space-y-3">
          <p>
            {tr("gmailConnected")} <strong>{connection.email}</strong>
            <br />
            <span className="text-sm text-slate-600">
              {tr("lastSync")}: {connection.last_sync_at ? formatDate(connection.last_sync_at, lang, true) : tr("never")}
            </span>
          </p>
          {connection.last_error && <p className="text-sm text-bad">{connection.last_error}</p>}
          <SyncButton label={tr("syncNow")} />
          <form action={disconnectGmailAction}>
            <button className="text-sm text-bad hover:underline">{tr("gmailDisconnect")}</button>
          </form>
        </div>
      ) : configured ? (
        <a href="/api/gmail/connect" className="btn">
          {tr("gmailConnect")}
        </a>
      ) : (
        <p className="text-sm text-warn">{tr("gmailNotConfigured")}</p>
      )}
    </div>
  );
}
