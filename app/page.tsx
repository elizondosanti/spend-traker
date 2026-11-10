import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";
import { BrandMark } from "@/components/BrandMark";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { translator } from "@/lib/i18n";
import { cookieTheme, currentUser, uiLang } from "@/lib/session";
import { isDemoOnly } from "@/lib/users";
import { demoAction } from "./actions";

export default async function Landing() {
  const user = await currentUser();
  if (user) redirect(user.onboarded ? "/inicio" : "/bienvenida");
  const lang = await uiLang();
  const theme = await cookieTheme();
  const tr = translator(lang);

  return (
    <main className="flex flex-1 flex-col text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-5 pt-5">
        <BrandMark priority />
        <div className="flex items-center gap-2">
          <ThemeToggle theme={theme} redirectTo="/" />
          <LangToggle lang={lang} redirectTo="/" />
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 py-10 md:grid-cols-2 md:gap-14">
        <section className="brand-hero rise-in">
          <Image src="/logo.png" alt="" width={72} height={72} priority className="brand-hero-mark" />
          <p className="brand-hero-name" aria-label="Spend Traker">
            <span className="brand-spend">Spend</span>
            <span className="brand-traker">Traker</span>
          </p>
          <h1 className="max-w-md text-[1.35rem] font-medium leading-snug tracking-[-0.015em] text-white/95 sm:text-[1.5rem]">
            {tr("tagline")}
          </h1>
          <p className="on-brand-muted max-w-md text-base leading-relaxed sm:text-lg">{tr("intro")}</p>
          <ul className="trust-list max-w-md">
            <li>{tr("trust1")}</li>
            <li>{tr("trust2")}</li>
            <li>{tr("trust3")}</li>
          </ul>
        </section>

        <section className="theme-surface rise-in-delay p-6 text-ink">
          <form action={demoAction}>
            <button type="submit" className="btn w-full py-3 text-base">
              {tr("tryDemo")}
            </button>
          </form>
          {isDemoOnly() ? (
            <p className="mt-4 text-center text-sm text-slate-500">{tr("demoOnlyNote")}</p>
          ) : (
            <>
              <p className="my-4 text-center text-sm text-slate-500">{tr("or")}</p>
              <AuthForms
                labels={{
                  login: tr("login"),
                  register: tr("register"),
                  name: tr("name"),
                  nameHelp: tr("nameHelp"),
                  email: tr("email"),
                  password: tr("password"),
                }}
              />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
