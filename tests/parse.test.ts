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
      cardLast4: "4743",
      ref: "4743-361611",
    });
    expect(parseBacEmail(sample("parquimetros"))).toMatchObject({ cardBrand: "MASTER", cardLast4: "3771", amount: 960 });
  });

  it("parses incoming SINPE with and without concept", () => {
    expect(parseBacEmail(sample("sinpe-sin-descripcion"))).toMatchObject({
      kind: "sinpe",
      direction: "ingreso",
      merchant: "ANA MORA SOLANO",
      concept: "",
      amount: 3,
      cardLast4: "3613",
      ref: "2026110310283002634402830",
    });
    expect(parseBacEmail(sample("sinpe-alimentacion"))?.concept).toBe("Categoria_alimentacion");
    expect(parseBacEmail(sample("sinpe-horas"))).toMatchObject({
      merchant: "DEPOSITO DE MADERAS SEBASELI S",
      concept: "Horas trabajo Fede",
      amount: 92250,
    });
  });

  it("parses a service payment", () => {
    expect(parseBacEmail(sample("municipalidad"))).toMatchObject({
      kind: "servicio",
      direction: "gasto",
      merchant: "Municipalidad de Tibás",
      concept: "Servicio municipales locales Tibas",
      amount: 197346.87,
      cardLast4: "8593",
      ref: "951442814",
    });
  });

  it("parses the HTML table version of a purchase", () => {
    const html = `<table><tr><td>Comercio:</td><td><b>DUNKIN MALL SAN PEDRO</b></td></tr>
      <tr><td>Fecha:</td><td>Oct 30, 2026, 12:13</td></tr>
      <tr><td>AMEX:</td><td>***********4743</td></tr>
      <tr><td>Autorizaci&oacute;n:</td><td>361611</td></tr>
      <tr><td>Tipo de Transacci&oacute;n:</td><td>COMPRA</td></tr>
      <tr><td>Monto:</td><td>CRC 10,300.00</td></tr></table>`;
    expect(parseBacEmail(htmlToText(html))).toMatchObject({ merchant: "DUNKIN MALL SAN PEDRO", amount: 10300, cardLast4: "4743" });
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
    const sent = `Estimado(a) Tomas Solano :
BAC Credomatic le comunica que SANTIAGO ELIZONDO BELLO realizó una transferencia electrónica a su cuenta N° *****7437.
La transferencia se realizó el día 04-11-2026 a las 19:57:28 horas; por un monto de 3,00 CRC , por concepto de:
Gasolina_______
El número de referencia es 2026110410284000607997209`;
    expect(samePerson("Santiago Elizondo", "SANTIAGO ELIZONDO BELLO")).toBe(true);
    expect(directionForHolder(sent, "Santiago Elizondo")).toBe("gasto");
    expect(parseBacEmail(sent)?.concept).toBe("Gasolina");
    const received = sent.replace("Tomas Solano", "Santiago Elizondo Bello").replace("SANTIAGO ELIZONDO BELLO", "ANA MORA SOLANO");
    expect(directionForHolder(received, "Santiago Elizondo")).toBe("ingreso");
    expect(directionForHolder(sent, "", ["elizondosanti0@gmail.com"])).toBe("gasto");
    expect(directionForHolder(received, "", ["elizondosanti0@gmail.com"])).toBe("ingreso");
  });

  it("normalizes memory keys", () => {
    expect(normalizeKey("  Categoria_alimentacion ")).toBe("categoria alimentacion");
    expect(normalizeKey("Municipalidad de  Tibás")).toBe("municipalidad de tibas");
  });
});
