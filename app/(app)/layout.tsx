import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LangToggle } from "@/components/LangToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Nav } from "@/components/Nav";
import { countPendingReviews } from "@/lib/data";
import { translator } from "@/lib/i18n";
import { cookieTheme, requireUser, uiLang } from "@/lib/session";
import { logoutAction } from "../actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  if (!user.onboarded) redirect("/bienvenida");
  const lang = await uiLang(user);
  const theme = await cookieTheme();
  const tr = translator(lang);
  const pending = await countPendingReviews(user.id);

  return (
    <>
      <header className="bg-brand text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/inicio" className="flex items-center gap-2 font-bold">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" />
            <span>Spend Traker</span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle theme={theme} />
            <LangToggle lang={lang} />
            <form action={logoutAction}>
              <button className="rounded-md px-2 py-1 text-sm text-white/80 hover:text-white">{tr("logout")}</button>
            </form>
          </div>
          <div className="w-full">
            <Nav
              items={[
                { href: "/inicio", label: tr("navHome") },
                { href: "/movimientos", label: tr("navTransactions") },
                { href: "/categorias", label: tr("navCategories") },
                { href: "/avisos", label: tr("navReview"), badge: pending },
                { href: "/ajustes", label: tr("navSettings") },
              ]}
            />
          </div>
        </div>
      </header>
      {user.is_demo && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">{tr("demoBanner")}</div>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
