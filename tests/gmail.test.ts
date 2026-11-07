import { describe, expect, it } from "vitest";
import { parseBacEmail } from "@/lib/bac/parse";
import { messageText } from "@/lib/gmail";

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64url");

describe("messageText", () => {
  it("prefers the HTML part of a multipart Gmail message and parses it", () => {
    const html =
      "<p>Hola</p><p>A continuación le detallamos la transacción realizada:</p><table>" +
      "<tr><td>Comercio:</td><td>DUNKIN TIBAS</td></tr>" +
      "<tr><td>Ciudad y país:</td><td>SAN JOSE, Costa Rica</td></tr>" +
      "<tr><td>Fecha:</td><td>Nov 3, 2026, 08:15</td></tr>" +
      "<tr><td>AMEX:</td><td>***********1001</td></tr>" +
      "<tr><td>Autorización:</td><td>123456</td></tr>" +
      "<tr><td>Tipo de Transacción:</td><td>COMPRA</td></tr>" +
      "<tr><td>Monto:</td><td>CRC 10,300.00</td></tr></table>";
    const { from, text } = messageText({
      mimeType: "multipart/alternative",
      headers: [
        { name: "From", value: "BAC Credomatic <notificacion@notificacionesbaccr.com>" },
        { name: "Subject", value: "Notificación de transacción" },
      ],
      parts: [
        { mimeType: "text/plain", body: { data: b64("texto plano") } },
        { mimeType: "text/html", body: { data: b64(html) } },
      ],
    });
    expect(from).toContain("notificacionesbaccr.com");
    expect(text.startsWith("Notificación de transacción")).toBe(true);
    const parsed = parseBacEmail(text);
    expect(parsed?.merchant).toBe("DUNKIN TIBAS");
    expect(parsed?.amount).toBe(10300);
    expect(parsed?.cardLast4).toBe("1001");
  });

  it("falls back to text/plain", () => {
    const { text } = messageText({
      mimeType: "text/plain",
      headers: [{ name: "Subject", value: "S" }],
      body: { data: b64("cuerpo") },
    });
    expect(text).toBe("S\ncuerpo");
  });
});
