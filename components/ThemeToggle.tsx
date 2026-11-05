import { setThemeAction } from "@/app/actions";
import type { Theme } from "@/lib/session";

export function ThemeToggle({ theme, redirectTo = "", tone = "dark" }: { theme: Theme; redirectTo?: string; tone?: "dark" | "light" }) {
  const base = tone === "dark" ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-ink";
  const active = tone === "dark" ? "bg-white/15 text-white" : "bg-brand-soft text-brand";
  return (
    <form action={setThemeAction} className="flex items-center gap-1 text-sm" aria-label="Apariencia">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {(["light", "dark"] as const).map((value) => (
        <button
          key={value}
          name="theme"
          value={value}
          aria-pressed={theme === value}
          className={`rounded-md px-2 py-1 ${theme === value ? active : base}`}
        >
          {value === "light" ? "☀" : "☾"}
        </button>
      ))}
    </form>
  );
}
