import { BAC_DOMAINS, isBacSender } from "./bac/parse";
import { decrypt, encrypt } from "./crypto";
import { query, queryOne } from "./db";
import { ingestEmail } from "./ingest";
import { htmlToText } from "./text";

const SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL = "https://gmail.googleapis.com/gmail/v1/users/me";

export function appUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

export function gmailConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

const redirectUri = () => `${appUrl()}/api/gmail/callback`;

export function gmailAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "false",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<{ access_token: string; refresh_token?: string; scope?: string }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      ...body,
    }),
  });
  if (!res.ok) throw new Error(`Google token error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function gmailGet<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${GMAIL}${path}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) throw new Error(`Gmail ${path} ${res.status}: ${await res.text()}`);
  return res.json();
}

export async function connectGmail(userId: string, code: string): Promise<void> {
  const tokens = await tokenRequest({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  if (!tokens.refresh_token) throw new Error("Google did not return a refresh token");
  if (tokens.scope) {
    const scopes = tokens.scope.split(" ");
    if (!scopes.includes(SCOPE)) throw new Error("Gmail read access was not granted");
    if (scopes.some((scope) => /gmail\.(modify|compose|send|insert)|mail\.google\.com/.test(scope))) {
      throw new Error("Gmail write access was granted");
    }
  }
  const profile = await gmailGet<{ emailAddress: string }>(tokens.access_token, "/profile");
  await query(
    `INSERT INTO gmail_connections (user_id, email, refresh_token_enc) VALUES ($1, $2, $3)
     ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, refresh_token_enc = EXCLUDED.refresh_token_enc, last_error = ''`,
    [userId, profile.emailAddress, encrypt(tokens.refresh_token)],
  );
}

export async function disconnectGmail(userId: string): Promise<void> {
  const row = await queryOne<{ refresh_token_enc: string }>("SELECT refresh_token_enc FROM gmail_connections WHERE user_id = $1", [userId]);
  await query("DELETE FROM gmail_connections WHERE user_id = $1", [userId]);
  if (row) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(decrypt(row.refresh_token_enc))}`, { method: "POST" }).catch(() => {});
  }
}

type Part = { mimeType?: string; body?: { data?: string }; parts?: Part[]; headers?: { name: string; value: string }[] };

function decodePart(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function findBody(part: Part, mime: string): string | null {
  if (part.mimeType === mime && part.body?.data) return decodePart(part.body.data);
  for (const child of part.parts ?? []) {
    const found = findBody(child, mime);
    if (found) return found;
  }
  return null;
}

export function messageText(payload: Part): { from: string; text: string } {
  const header = (name: string) => payload.headers?.find((h) => h.name.toLowerCase() === name)?.value ?? "";
  const html = findBody(payload, "text/html");
  const body = html ? htmlToText(html) : (findBody(payload, "text/plain") ?? "");
  return { from: header("from"), text: `${header("subject")}\n${body}` };
}

export type SyncResult = { checked: number; created: number; skipped: number };

export async function syncGmail(userId: string): Promise<SyncResult> {
  const conn = await queryOne<{ refresh_token_enc: string; last_sync_at: string | Date | null }>(
    "SELECT refresh_token_enc, last_sync_at FROM gmail_connections WHERE user_id = $1",
    [userId],
  );
  if (!conn) return { checked: 0, created: 0, skipped: 0 };
  const result: SyncResult = { checked: 0, created: 0, skipped: 0 };
  try {
    const { access_token } = await tokenRequest({ refresh_token: decrypt(conn.refresh_token_enc), grant_type: "refresh_token" });
    const since = conn.last_sync_at ? new Date(conn.last_sync_at).getTime() : Date.now() - 30 * 86400_000;
    const days = Math.min(30, Math.ceil((Date.now() - since) / 86400_000) + 1);
    const senders = BAC_DOMAINS.map((d) => `from:${d}`).join(" OR ");
    const q = encodeURIComponent(`(${senders}) newer_than:${days}d`);
    const list = await gmailGet<{ messages?: { id: string }[] }>(access_token, `/messages?q=${q}&maxResults=50`);

    for (const { id } of list.messages ?? []) {
      result.checked++;
      const seen = await queryOne("SELECT 1 FROM processed_emails WHERE user_id = $1 AND gmail_id = $2", [userId, id]);
      if (seen) {
        result.skipped++;
        continue;
      }
      const message = await gmailGet<{ payload: Part }>(access_token, `/messages/${id}?format=full`);
      const { from, text } = messageText(message.payload);
      let status = "ignored_sender";
      if (isBacSender(from)) {
        status = (await ingestEmail({ userId, text, gmailId: id })).status;
      }
      if (status === "created") result.created++;
      await query(
        "INSERT INTO processed_emails (user_id, gmail_id, status) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [userId, id, status],
      );
    }
    await query("UPDATE gmail_connections SET last_sync_at = now(), last_error = '' WHERE user_id = $1", [userId]);
  } catch (error) {
    await query("UPDATE gmail_connections SET last_error = $2 WHERE user_id = $1", [userId, String(error).slice(0, 500)]);
    throw error;
  }
  return result;
}

const STALE_AFTER_MS = 2 * 60_000;

export async function syncGmailIfStale(userId: string): Promise<void> {
  const conn = await queryOne<{ last_sync_at: string | Date | null }>("SELECT last_sync_at FROM gmail_connections WHERE user_id = $1", [userId]);
  if (!conn) return;
  if (conn.last_sync_at && Date.now() - new Date(conn.last_sync_at).getTime() < STALE_AFTER_MS) return;
  await syncGmail(userId).catch((error) => console.error("Background Gmail sync failed", error));
}

export async function syncAllGmail(): Promise<{ users: number; created: number; failed: number }> {
  const conns = await query<{ user_id: string }>("SELECT user_id FROM gmail_connections");
  let created = 0;
  let failed = 0;
  for (const { user_id } of conns) {
    try {
      created += (await syncGmail(user_id)).created;
    } catch {
      failed++;
    }
  }
  return { users: conns.length, created, failed };
}
