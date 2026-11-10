"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/app/actions";

export function PasswordForm({ labels }: { labels: { current: string; next: string; save: string } }) {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="space-y-2">
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">{labels.current}</span>
        <input name="current" type="password" required autoComplete="current-password" className="input" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold">{labels.next}</span>
        <input name="next" type="password" required minLength={8} autoComplete="new-password" className="input" />
      </label>
      <button className="btn-ghost" disabled={pending}>
        {labels.save}
      </button>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.message && <p className="text-sm text-ok">{state.message}</p>}
    </form>
  );
}
