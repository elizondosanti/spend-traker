import { setLangAction } from "@/app/actions";
import type { Lang } from "@/lib/i18n";

export function LangToggle({ lang, redirectTo = "", tone = "dark" }: { lang: Lang; redirectTo?: string; tone?: "dark" | "light" }) {
  return (
    <form action={setLangAction} className="segment" aria-label="Idioma / Language">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="segment-frame" data-tone={tone}>
        {(["es", "en"] as const).map((l) => (
          <button
            key={l}
            name="lang"
            value={l}
            type="submit"
            aria-pressed={lang === l}
            className="segment-item uppercase"
          >
            {l}
          </button>
        ))}
      </div>
    </form>
  );
}
