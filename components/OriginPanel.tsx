"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BudgetBar } from "@/components/BudgetBar";

export type OriginRow = {
  id: string;
  href: string;
  merchant: string;
  /** Descripción del correo; vacío = no mostrar. */
  concept?: string | null;
  meta: string;
  amount: string;
  income: boolean;
};

export type OriginDetail = {
  merchant: string;
  /** Concepto del movimiento; si `conceptEmpty`, se muestra como estado vacío sin comillas. */
  concept?: string | null;
  conceptEmpty?: boolean;
  amount: string;
  income: boolean;
  kind: string;
  rows: { label: string; value: string }[];
};

export type OriginCategory = {
  name: string;
  group: string;
  spent: number;
  budget: number;
  total: string;
  count: number;
};

type Labels = {
  breakdown: string;
  help: string;
  empty: string;
  close: string;
  back: string;
  total: string;
  details: string;
};

export function OriginPanel({
  closeHref,
  backHref,
  category,
  rows = [],
  detail,
  labels,
}: {
  closeHref: string;
  backHref?: string;
  category?: OriginCategory;
  rows?: OriginRow[];
  detail?: OriginDetail;
  labels: Labels;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") router.push(closeHref);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [closeHref, router]);

  const title = detail ? detail.merchant : (category?.name ?? labels.details);
  const subtitle = detail ? detail.kind : category?.group;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <Link href={closeHref} className="scrim-in absolute inset-0 bg-black/40" aria-label={labels.close} />
      <aside ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="origin-title" className="sheet sheet-in relative z-10 outline-none">
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            {detail && backHref && (
              <Link href={backHref} className="mb-1 inline-block text-sm text-brand hover:underline">
                ← {labels.back}
              </Link>
            )}
            <h2 id="origin-title" className="truncate text-lg font-bold">
              {title}
            </h2>
            {detail?.concept && (
              <p
                className={`mt-0.5 text-sm break-words ${detail.conceptEmpty ? "italic text-slate-500" : "font-medium text-ink"}`}
              >
                {detail.conceptEmpty ? detail.concept : `“${detail.concept}”`}
              </p>
            )}
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <Link href={closeHref} className="btn-ghost shrink-0 px-3" aria-label={labels.close}>
            ✕
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4">
          {detail ? (
            <div>
              <p className={`num-display text-[1.75rem] ${detail.income ? "text-ok" : "text-ink"}`}>{detail.amount}</p>
              <dl className="mt-5 space-y-3">
                {detail.rows.map((row) => (
                  <div key={row.label} className="border-b border-slate-100 pb-3">
                    <dt className="text-xs text-slate-500">{row.label}</dt>
                    <dd className="mt-0.5 font-medium break-words">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            category && (
              <div>
                <p className="text-sm text-slate-600">{labels.help}</p>
                <div className="mt-4 rounded-xl bg-brand-soft p-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm">{labels.total}</span>
                    <span className="text-lg font-bold">{category.total}</span>
                  </div>
                  {category.budget > 0 && <BudgetBar spent={category.spent} budget={category.budget} label={category.name} />}
                </div>
                <h3 className="mt-5 mb-1 font-semibold">
                  {labels.breakdown} ({category.count})
                </h3>
                {rows.length === 0 ? (
                  <p className="text-sm text-slate-500">{labels.empty}</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <Link href={row.href} className="flex items-center justify-between gap-3 py-3 hover:opacity-80">
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">{row.merchant}</span>
                            {row.concept && <span className="block truncate text-sm text-slate-600">“{row.concept}”</span>}
                            <span className="text-xs text-slate-500">{row.meta}</span>
                          </span>
                          <span className={`num shrink-0 text-right font-semibold tabular-nums tracking-normal ${row.income ? "text-ok" : "text-ink"}`}>
                            {row.amount}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
}
