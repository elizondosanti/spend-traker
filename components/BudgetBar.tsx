export function BudgetBar({ spent, budget, label }: { spent: number; budget: number; label: string }) {
  const ratio = budget > 0 ? spent / budget : 0;
  const color = ratio > 1 ? "bg-bad" : ratio > 0.85 ? "bg-warn" : "bg-ok";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(Math.min(ratio, 1) * 100)}
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200"
    >
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </div>
  );
}
