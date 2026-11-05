import { setThemeAction } from "@/app/actions";
import type { Theme } from "@/lib/session";

function SunIcon() {
  return (
    <svg className="segment-icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="2.75" fill="currentColor" />
      <path
        d="M8 1.25v1.5M8 13.25v1.5M1.25 8h1.5M13.25 8h1.5M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="segment-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M12.7 9.55A5.25 5.25 0 0 1 6.45 3.3 4.75 4.75 0 1 0 12.7 9.55Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ThemeToggle({ theme, redirectTo = "", tone = "dark" }: { theme: Theme; redirectTo?: string; tone?: "dark" | "light" }) {
  return (
    <form action={setThemeAction} className="segment" aria-label="Apariencia">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="segment-frame" data-tone={tone}>
        {(["light", "dark"] as const).map((value) => (
          <button
            key={value}
            name="theme"
            value={value}
            type="submit"
            aria-pressed={theme === value}
            aria-label={value === "light" ? "Claro" : "Oscuro"}
            className="segment-item"
          >
            {value === "light" ? <SunIcon /> : <MoonIcon />}
          </button>
        ))}
      </div>
    </form>
  );
}
