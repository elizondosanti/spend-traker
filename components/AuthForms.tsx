"use client";

import { useActionState, useState } from "react";
import { loginAction, registerAction } from "@/app/actions";

type Labels = {
  login: string;
  register: string;
  name: string;
  nameHelp?: string;
  email: string;
  password: string;
};

export function AuthForms({ labels }: { labels: Labels }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loginState, login, loggingIn] = useActionState(loginAction, undefined);
  const [registerState, register, registering] = useActionState(registerAction, undefined);
  const state = mode === "login" ? loginState : registerState;

  return (
    <div>
      <div role="tablist" className="auth-tabs mb-4">
        {(["login", "register"] as const).map((m) => (
          <button key={m} role="tab" type="button" aria-selected={mode === m} onClick={() => setMode(m)} className="auth-tab">
            {labels[m]}
          </button>
        ))}
      </div>
      <form action={mode === "login" ? login : register} className="space-y-3">
        {mode === "register" && (
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{labels.name}</span>
            <input name="name" required autoComplete="name" placeholder="Santiago Elizondo" className="input" />
            {labels.nameHelp && <span className="mt-1 block text-xs text-slate-500">{labels.nameHelp}</span>}
          </label>
        )}
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{labels.email}</span>
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">{labels.password}</span>
          <input
            name="password"
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="input"
          />
        </label>
        {state?.error && (
          <p role="alert" className="text-sm text-bad">
            {state.error}
          </p>
        )}
        <button className="btn w-full" disabled={loggingIn || registering}>
          {labels[mode]}
        </button>
      </form>
    </div>
  );
}
