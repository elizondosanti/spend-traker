import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sign, unsign } from "./crypto";
import type { Lang } from "./i18n";
import { getUserById, type User } from "./users";

const SESSION_COOKIE = "st_session";
const LANG_COOKIE = "st_lang";

export async function startSession(userId: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, sign(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  const userId = unsign((await cookies()).get(SESSION_COOKIE)?.value);
  return userId ? getUserById(userId) : null;
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/");
  return user;
}

export async function cookieLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "es";
}

/** The language toggle (cookie) wins; otherwise the user's saved preference. */
export async function uiLang(user?: User | null): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  if (value === "en" || value === "es") return value;
  return user?.lang ?? "es";
}

export async function setCookieLang(lang: Lang): Promise<void> {
  (await cookies()).set(LANG_COOKIE, lang, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
