import { NextResponse } from "next/server";
import { randomToken, sign } from "@/lib/crypto";
import { appUrl, gmailAuthUrl, gmailConfigured } from "@/lib/gmail";
import { currentUser } from "@/lib/session";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.redirect(`${appUrl()}/`);
  if (user.is_demo || !gmailConfigured()) return NextResponse.redirect(`${appUrl()}/ajustes?gmail=error`);
  const state = sign(`${user.id}:${randomToken()}`);
  return NextResponse.redirect(gmailAuthUrl(state));
}
