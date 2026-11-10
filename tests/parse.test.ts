import { describe, expect, it } from "vitest";
import { directionForHolder, isBacSender, parseBacDate, parseBacEmail, samePerson } from "@/lib/bac/parse";
import { SAMPLE_EMAILS } from "@/lib/bac/samples";
import { parseAmount } from "@/lib/money";
import { htmlToText, normalizeKey } from "@/lib/text";

const sample = (id: string) => SAMPLE_EMAILS.find((s) => s.id === id)!.text;

describe("parseAmount", () => {
  it.each([
    ["CRC 10,300.00", 10300],
    ["3,00 CRC", 3],
    ["92.250,00", 92250],
    ["197,346.87 CRC", 197346.87],
    ["CRC 960.00", 960],
    ["₡ 8.500", 8500],
  ])("%s -> %d", (raw, value) => expect(parseAmount(raw)).toBe(value));
});

describe("parseBacDate", () => {
  it("reads card, SINPE and service formats in Costa Rica time", () => {
    expect(parseBacDate("Oct 30, 2026, 12:13")).toBe("2026-10-30T12:13:00-06:00");
    expect(parseBacDate("03-11-2026 09:55:13")).toBe("2026-11-03T09:55:13-06:00");
    expect(parseBacDate("2024-06-05 12:45:36.744")).toBe("2024-06-05T12:45:36-06:00");
  });
});

describe("parseBacEmail", () => {
  it("parses a card purchase", () => {
    expect(parseBacEmail(sample("dunkin"))).toMatchObject({
      kind: "compra",
      direction: "gasto",
      merchant: "DUNKIN MALL SAN PEDRO",
      city: "Costa Rica",
      amount: 10300,
      currency: "CRC",
      cardBrand: "AMEX",
      cardLast4: "1001",
      ref: "1001-900000011",
    });
    expect(parseBacEmail(sample("parquimetros"))).toMatchObject({ cardBrand: "MASTER", cardLast4: "2002", amount: 960 });
  });

  it("parses incoming SINPE with and without concept", () => {
    expect(parseBacEmail(sample("sinpe-sin-descripcion"))).toMatchObject({
      kind: "sinpe",
      direction: "ingreso",
      merchant: "MARIA DEMO QUIROS",
      concept: "",
      amount: 3,
      cardLast4: "1001",
      ref: "2026110300000000000000001",
    });
    expect(parseBacEmail(sample("sinpe-alimentacion"))?.concept).toBe("Categoria_alimentacion");
    expect(parseBacEmail(sample("sinpe-horas"))).toMatchObject({
      merchant: "EMPRESA DEMO MADERAS S.A.",
      concept: "Horas trabajo demo",
      amount: 92250,
    });
  });

  it("parses a service payment", () => {
    expect(parseBacEmail(sample("municipalidad"))).toMatchObject({
      kind: "servicio",
      direction: "gasto",
      merchant: "Municipalidad de Ejemplo",
      concept: "Servicio municipal demo",
      amount: 150000,
      cardLast4: "3003",
      ref: "900000001",
    });
  });

  it("parses the HTML table version of a purchase", () => {
    const html = `<table><tr><td>Comercio:</td><td><b>DUNKIN MALL SAN PEDRO</b></td></tr>
      <tr><td>Fecha:</td><td>Oct 30, 2026, 12:13</td></tr>
      <tr><td>AMEX:</td><td>***********1001</td></tr>
      <tr><td>Autorizaci&oacute;n:</td><td>900000011</td></tr>
      <tr><td>Tipo de Transacci&oacute;n:</td><td>COMPRA</td></tr>
      <tr><td>Monto:</td><td>CRC 10,300.00</td></tr></table>`;
    expect(parseBacEmail(htmlToText(html))).toMatchObject({ merchant: "DUNKIN MALL SAN PEDRO", amount: 10300, cardLast4: "1001" });
  });

  it("ignores emails that are not BAC movements", () => {
    expect(parseBacEmail("Hola, conocé nuestras promociones de 30% de descuento")).toBeNull();
  });
});

describe("helpers", () => {
  it("only trusts official BAC senders", () => {
    expect(isBacSender("Notificación BAC <notificacion@baccredomatic.com>")).toBe(true);
    expect(isBacSender("BAC <notificacion@notificacionesbaccr.com>")).toBe(true);
    expect(isBacSender("x@notificacionesbaccr.com.evil.io")).toBe(false);
    expect(isBacSender("comprobante_cri@baccredomatic.com")).toBe(true);
    expect(isBacSender("bac@baccredomatic.com.evil.io")).toBe(false);
    expect(isBacSender("alerta@fake-baccredomatic.com")).toBe(false);
  });

  it("treats a SINPE I sent as a gasto, and one addressed to me as an ingreso", () => {
    const sent = `Estimado(a) Tomas Demo :
BAC Credomatic le comunica que ALEX RIVERA DEMO realizó una transferencia electrónica a su cuenta N° *****1001.
La transferencia se realizó el día 04-11-2026 a las 19:57:28 horas; por un monto de 3,00 CRC , por concepto de:
Gasolina_______
El número de referencia es 2026110400000000000000009`;
    expect(samePerson("Alex Rivera", "ALEX RIVERA DEMO")).toBe(true);
    expect(directionForHolder(sent, "Alex Rivera")).toBe("gasto");
    expect(parseBacEmail(sent)?.concept).toBe("Gasolina");
    const received = sent.replace("Tomas Demo", "Alex Rivera Demo").replace("ALEX RIVERA DEMO", "MARIA DEMO QUIROS");
    expect(directionForHolder(received, "Alex Rivera")).toBe("ingreso");
    expect(directionForHolder(sent, "", ["alex.rivera@example.com"])).toBe("gasto");
    expect(directionForHolder(received, "", ["alex.rivera@example.com"])).toBe("ingreso");
  });

  it("normalizes memory keys", () => {
    expect(normalizeKey("  Categoria_alimentacion ")).toBe("categoria alimentacion");
    expect(normalizeKey("Café  Ejemplo")).toBe("cafe ejemplo");
  });
});
