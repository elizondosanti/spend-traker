import { NextResponse, type NextRequest } from "next/server";
import { unsign } from "@/lib/crypto";
import { appUrl, connectGmail, syncGmail } from "@/lib/gmail";
import { currentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/`);
  const back = user.onboarded ? "/ajustes" : "/bienvenida?paso=3";
  const separator = back.includes("?") ? "&" : "?";

  const code = request.nextUrl.searchParams.get("code");
  const stateUser = unsign(request.nextUrl.searchParams.get("state") ?? undefined)?.split(":")[0];
  if (!code || stateUser !== user.id) {
    return NextResponse.redirect(`${appUrl()}${back}${separator}gmail=error`);
  }
  try {
    await connectGmail(user.id, code);
    await syncGmail(user.id).catch(() => null);
    return NextResponse.redirect(`${appUrl()}${back}${separator}gmail=ok`);
  } catch (error) {
    console.error("Gmail connect failed", error);
    return NextResponse.redirect(`${appUrl()}${back}${separator}gmail=error`);
  }
}
