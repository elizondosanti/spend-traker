"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addExpenseAction } from "@/app/actions";
import { DateTimeField } from "@/components/DateTimeField";
import type { Lang } from "@/lib/i18n";

type Option = { id: string; name: string; group: string };
type CardOption = { id: string; label: string };
type Mode = "gasto" | "ingreso";

export function ManualExpenseForm({
  categories,
  cards,
  groupLabels,
  defaultWhen,
  lang,
  labels,
}: {
  categories: Option[];
  cards: CardOption[];
  groupLabels: Record<string, string>;
  defaultWhen: string;
  lang: Lang;
  labels: {
    addExpense: string;
    addIncome: string;
    help: string;
    incomeHelp: string;
    name: string;
    namePlaceholder: string;
    amount: string;
    amountExample: string;
    currency: string;
    when: string;
    dateHint: string;
    category: string;
    uncategorized: string;
    paidWith: string;
    cash: string;
    sinpeMovil: string;
    bankTransfer: string;
    save: string;
  };
}) {
  const [state, action, pending] = useActionState(addExpenseAction, undefined);
  const [mode, setMode] = useState<Mode | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (window.location.hash === "#ingreso") setMode("ingreso");
    else if (window.location.hash === "#agregar") setMode("gasto");
  }, []);

  useEffect(() => {
    if (!state?.message) return;
    formRef.current?.reset();
  }, [state]);

  const groups = (mode === "ingreso" ? ["income"] : ["bills", "needs", "wants"]).filter((group) => groupLabels[group]);

  return (
    <section id="agregar" className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {(["gasto", "ingreso"] as const).map((value) => (
          <button
            key={value}
            id={value === "gasto" ? "agregar" : "ingreso"}
            type="button"
            className={mode === value ? "btn" : "btn-ghost"}
            aria-expanded={mode === value}
            onClick={() => setMode((current) => (current === value ? null : value))}
          >
            {value === "gasto" ? labels.addExpense : labels.addIncome}
            <span aria-hidden>{mode === value ? "▴" : "▾"}</span>
          </button>
        ))}
      </div>

      {mode && (
        <form key={mode} ref={formRef} action={action} className="form-reveal card grid gap-3 sm:grid-cols-2">
          <p className="text-sm text-slate-600 sm:col-span-2">{mode === "gasto" ? labels.help : labels.incomeHelp}</p>
          <input type="hidden" name="direction" value={mode} />
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">
              {labels.name} <span className="text-bad">*</span>
            </span>
            <input name="merchant" required maxLength={80} placeholder={labels.namePlaceholder} className="input" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">
              {labels.amount} <span className="text-bad">*</span>
            </span>
            <input name="amount" required inputMode="decimal" placeholder={labels.amountExample} className="input" />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{labels.currency}</span>
            <select name="currency" defaultValue="CRC" className="input">
              <option value="CRC">CRC</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <div className="sm:col-span-2">
            <DateTimeField name="occurred" defaultValue={defaultWhen} lang={lang} label={labels.when} hint={labels.dateHint} />
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{labels.category}</span>
            <select name="categoryId" defaultValue="" className="input">
              <option value="">{labels.uncategorized}</option>
              {groups.map((group) => (
                <optgroup key={group} label={groupLabels[group]}>
                  {categories
                    .filter((category) => category.group === group)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">{labels.paidWith}</span>
            <select name="payment" defaultValue="efectivo" className="input">
              <option value="efectivo">{labels.cash}</option>
              <option value="sinpe_movil">{labels.sinpeMovil}</option>
              <option value="transferencia">{labels.bankTransfer}</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="btn" disabled={pending}>
              {pending ? "…" : labels.save}
            </button>
            <p aria-live="polite" className="mt-2 min-h-5 text-sm">
              {state?.error && <span className="text-bad">{state.error}</span>}
              {state?.message && <span className="font-medium text-ok">✓ {state.message}</span>}
            </p>
          </div>
        </form>
      )}
    </section>
  );
}
