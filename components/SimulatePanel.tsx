"use client";

import { useActionState } from "react";
import { simulateAction, syncGmailAction } from "@/app/actions";

export function SimulatePanel({
  labels,
}: {
  labels: { title: string; help: string; button: string; paste: string };
}) {
  const [state, action, pending] = useActionState(simulateAction, undefined);
  return (
    <form action={action} className="card space-y-3">
      <div>
        <h2 className="font-semibold">{labels.title}</h2>
        <p className="text-sm text-slate-600">{labels.help}</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">{labels.paste}</span>
        <textarea name="text" rows={8} required className="input font-mono text-xs" placeholder={labels.paste} />
      </label>
      <button className="btn" disabled={pending}>
        {pending ? "…" : labels.button}
      </button>
      <p aria-live="polite" className="min-h-5 text-sm">
        {state?.message && <span className="font-medium text-ok">✓ {state.message}</span>}
        {state?.error && <span className="text-bad">{state.error}</span>}
      </p>
    </form>
  );
}

export function SyncButton({ label }: { label: string }) {
  const [state, action, pending] = useActionState(syncGmailAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <button className="btn" disabled={pending}>
        {pending ? "…" : label}
      </button>
      <span aria-live="polite" className="text-sm">
        {state?.message && <span className="text-ok">{state.message}</span>}
        {state?.error && <span className="text-bad">{state.error}</span>}
      </span>
    </form>
  );
}
