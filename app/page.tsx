import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/AuthForms";
import { LangToggle } from "@/components/LangToggle";
import { translator } from "@/lib/i18n";
import { cookieTheme, currentUser, uiLang } from "@/lib/session";
import { ThemeToggle } from "@/components/ThemeToggle";
import { demoAction } from "./actions";

export default async function Landing() {
  const user = await currentUser();
  if (user) redirect(user.onboarded ? "/inicio" : "/bienvenida");
  const lang = await uiLang();
  const theme = await cookieTheme();
  const tr = translator(lang);

  return (
    <main className="flex flex-1 flex-col bg-brand text-white">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-end px-5 pt-5">
        <ThemeToggle theme={theme} redirectTo="/" />
        <LangToggle lang={lang} redirectTo="/" />
      </header>
      <div className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 py-10 md:grid-cols-2">
        <section>
          <Image src="/logo.png" alt="Spend Traker" width={200} height={200} priority className="mb-6 rounded-2xl" />
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{tr("tagline")}</h1>
          <p className="mt-4 max-w-md text-lg text-white/85">{tr("pitch")}</p>
          <ul className="mt-6 space-y-2 text-white/85">
            <li>✓ {tr("trust1")}</li>
            <li>✓ {tr("trust2")}</li>
            <li>✓ {tr("trust3")}</li>
          </ul>
        </section>
        <section className="theme-surface p-6 text-ink">
          <form action={demoAction}>
            <button className="btn w-full bg-ink py-3 text-base hover:bg-black">{tr("tryDemo")}</button>
          </form>
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
        </section>
      </div>
    </main>
  );
}
