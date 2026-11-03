import { setLangAction } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang, redirectTo = "", tone = "dark" }: { lang: Lang; redirectTo?: string; tone?: "dark" | "light" }) {
  const base = tone === "dark" ? "text-white/70 hover:text-white" : "text-slate-500 hover:text-ink";
  const active = tone === "dark" ? "bg-white/15 text-white" : "bg-brand-soft text-brand";
  return (
    <form action={setLangAction} className="flex items-center gap-1 text-sm" aria-label="Idioma / Language">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      {(["es", "en"] as const).map((l) => (
        <button
          key={l}
          name="lang"
          value={l}
          aria-pressed={lang === l}
          className={`rounded-md px-2 py-1 font-semibold uppercase ${lang === l ? active : base}`}
        >
          {l}
        </button>
      ))}
    </form>
  );
}
