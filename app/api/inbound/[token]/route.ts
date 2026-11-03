import { NextResponse, type NextRequest } from "next/server";
import { isBacSender } from "@/lib/bac/parse";
import { queryOne } from "@/lib/db";
import { ingestEmail } from "@/lib/ingest";
import { htmlToText } from "@/lib/text";

const MAX_BYTES = 200_000;

/**
 * Plan B for people who don't want to connect Gmail: forward BAC emails here.
 * Accepts JSON { from, subject, text, html } or the raw email text.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/inbound/[token]">) {
  const { token } = await params;
  const user = await queryOne<{ id: string }>("SELECT id FROM users WHERE inbound_token = $1 AND is_demo = false", [token]);
  if (!user) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const raw = await request.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

  let from = "";
  let text = raw;
  if (request.headers.get("content-type")?.includes("application/json")) {
    try {
      const body = JSON.parse(raw) as { from?: string; subject?: string; text?: string; html?: string };
      from = body.from ?? "";
      text = `${body.subject ?? ""}\n${body.html ? htmlToText(body.html) : (body.text ?? "")}`;
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
  } else if (/<html|<table/i.test(raw)) {
    text = htmlToText(raw);
  }

  // A forward comes from the user's own address, so accept it when the BAC origin is visible in the content.
  const fromBac = (from && isBacSender(from)) || /@baccredomatic\.com|@notificacionesbaccr\.com|BAC Credomatic/i.test(text);
  if (!fromBac) return NextResponse.json({ error: "not_bac" }, { status: 422 });

  const result = await ingestEmail({ userId: user.id, text });
  return NextResponse.json(result, { status: result.status === "created" ? 201 : 200 });
}
