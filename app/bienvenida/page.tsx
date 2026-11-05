import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { archiveCategoryAction, createCategoryAction, finishOnboardingAction, setLangAction, updateCategoryAction } from "@/app/actions";
import { GmailCard } from "@/components/GmailCard";
import { GROUPS } from "@/lib/categories";
import { getGmailConnection, listCategories } from "@/lib/data";
import { appUrl, gmailConfigured } from "@/lib/gmail";
import { translator } from "@/lib/i18n";
import { requireUser, uiLang } from "@/lib/session";

const STEPS = 3;

export default async function Onboarding({ searchParams }: PageProps<"/bienvenida">) {
  const user = await requireUser();
  if (user.onboarded) redirect("/inicio");
  const lang = await uiLang(user);
  const tr = translator(lang);
  const { paso } = await searchParams;
  const step = Math.min(STEPS, Math.max(1, Number(paso) || 1));

  return (
    <main className="flex flex-1 flex-col bg-brand px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3 text-white">
          <Image src="/logo.png" alt="" width={48} height={48} className="rounded-xl" />
          <div>
            <p className="text-sm text-white/70">
              {tr("step")} {step} / {STEPS}
            </p>
            <h1 className="text-xl font-bold">{tr("welcome")}</h1>
          </div>
        </div>
        <div className="flex gap-1" aria-hidden>
          {Array.from({ length: STEPS }, (_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < step ? "bg-white" : "bg-white/25"}`} />
          ))}
        </div>
        <div className="card space-y-4">
          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">{tr("chooseLanguage")}</h2>
              <form action={setLangAction} className="grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="redirectTo" value="/bienvenida?paso=2" />
                <button name="lang" value="es" className={lang === "es" ? "btn py-4" : "btn-ghost py-4"}>
                  🇨🇷 Español
                </button>
                <button name="lang" value="en" className={lang === "en" ? "btn py-4" : "btn-ghost py-4"}>
                  🇺🇸 English
                </button>
              </form>
            </>
          )}
          {step === 2 && <CategoriesStep userId={user.id} lang={lang} />}
          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">{tr("connectGmailTitle")}</h2>
              <GmailCard
                lang={lang}
                connection={await getGmailConnection(user.id)}
                configured={gmailConfigured()}
                isDemo={user.is_demo}
                inboundUrl={user.is_demo ? undefined : `${appUrl()}/api/inbound/${user.inbound_token}`}
              />
              <form action={finishOnboardingAction}>
                <button className="btn w-full">{tr("finish")}</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

async function CategoriesStep({ userId, lang }: { userId: string; lang: "es" | "en" }) {
  const tr = translator(lang);
  const categories = await listCategories(userId);
  return (
    <>
      <div>
        <h2 className="text-lg font-semibold">{tr("reviewCategories")}</h2>
        <p className="text-sm text-slate-600">{tr("reviewCategoriesHelp")}</p>
      </div>
      {GROUPS.filter((g) => g !== "income").map((g) => (
        <section key={g}>
          <h3 className="mb-2 font-semibold text-brand">{tr(g)}</h3>
          <ul className="space-y-2">
            {categories
              .filter((c) => c.grp === g)
              .map((c) => (
                <li key={c.id} className="flex gap-2">
                  <form action={updateCategoryAction} className="grid flex-1 grid-cols-[1fr_8rem_auto] gap-2">
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="grp" value={c.grp} />
                    <input type="hidden" name="currency" value={c.currency} />
                    <input name="name" defaultValue={c.name} aria-label={tr("name")} className="input" />
                    <input name="budget" type="number" min={0} defaultValue={c.budget} aria-label={tr("monthlyCap")} className="input" />
                    <button className="btn-ghost px-3" aria-label={tr("save")}>
                      ✓
                    </button>
                  </form>
                  <form action={archiveCategoryAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="rounded-lg px-3 py-2 text-bad hover:bg-red-50" aria-label={tr("archive")}>
                      ✕
                    </button>
                  </form>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <form action={createCategoryAction} className="grid gap-2 border-t border-slate-100 pt-4 sm:grid-cols-[1fr_9rem_7rem_auto]">
        <input name="name" required placeholder={tr("newCategory")} aria-label={tr("newCategory")} className="input" />
        <select name="grp" defaultValue="wants" aria-label={tr("group")} className="input">
          {GROUPS.map((g) => (
            <option key={g} value={g}>
              {tr(g)}
            </option>
          ))}
        </select>
        <input name="budget" type="number" min={0} defaultValue={0} aria-label={tr("monthlyCap")} className="input" />
        <button className="btn-ghost">{tr("add")}</button>
      </form>
      <Link href="/bienvenida?paso=3" className="btn w-full">
        {tr("continue")}
      </Link>
    </>
  );
}
