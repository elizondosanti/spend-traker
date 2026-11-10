import { query, queryOne } from "./db";
import { ingestEmail, learn } from "./ingest";
import { createUser, DEMO_EMAIL } from "./users";

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Costa Rica "today" (UTC-6). */
function crNow(): Date {
  return new Date(Date.now() - 6 * 3600 * 1000);
}

function purchaseEmail(p: { merchant: string; city: string; brand: string; last4: string; auth: number; amount: string; day: Date; time: string }) {
  const d = p.day;
  return `Notificación de transacción ${p.merchant}
Comercio: ${p.merchant}
Ciudad y país: ${p.city}, Costa Rica
Fecha: ${MONTHS_EN[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${p.time}
${p.brand}: ************${p.last4}
Autorización: ${p.auth}
Tipo de Transacción: COMPRA
Monto: ${p.amount}`;
}

function sinpeEmail(p: { from: string; account: string; amount: string; concept: string; ref: string; day: Date }) {
  const d = p.day;
  const date = `${String(d.getUTCDate()).padStart(2, "0")}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${d.getUTCFullYear()}`;
  return `Notificación de Transferencia Local
BAC Credomatic le comunica que ${p.from} realizó una transferencia electrónica a su cuenta N° *****${p.account}.
La transferencia se realizó el día ${date} a las 08:30:00 horas; por un monto de ${p.amount} , por concepto de:
${p.concept}
El número de referencia es ${p.ref}
Muchas Gracias.`;
}

const PURCHASES = [
  { merchant: "AUTO MERCADO ESCAZU", city: "Escazu", brand: "VISA", last4: "1205", amount: "CRC 38,420.00" },
  { merchant: "WALMART CURRIDABAT", city: "Curridabat", brand: "MASTER", last4: "8810", amount: "CRC 52,310.00" },
  { merchant: "DUNKIN MALL SAN PEDRO", city: "", brand: "AMEX", last4: "1001", amount: "CRC 4,850.00" },
  { merchant: "STARBUCKS AVENIDA ESCAZU", city: "Escazu", brand: "AMEX", last4: "1001", amount: "CRC 3,900.00" },
  { merchant: "UBER TRIP", city: "San Jose", brand: "MASTER", last4: "2002", amount: "CRC 6,240.00" },
  { merchant: "MSJ PARQUIMETROS", city: "SanJose", brand: "MASTER", last4: "2002", amount: "CRC 960.00" },
  { merchant: "SERVICENTRO DELTA LA SABANA", city: "San Jose", brand: "VISA", last4: "1205", amount: "CRC 30,000.00" },
  { merchant: "FARMACIA FISCHEL", city: "Heredia", brand: "VISA", last4: "1205", amount: "CRC 12,780.00" },
  { merchant: "NETFLIX.COM", city: "Los Gatos", brand: "VISA", last4: "1205", amount: "USD 15.49" },
  { merchant: "SPOTIFY", city: "Stockholm", brand: "AMEX", last4: "1001", amount: "USD 6.99" },
  { merchant: "CINEPOLIS TERRAMALL", city: "Cartago", brand: "MASTER", last4: "2002", amount: "CRC 9,600.00" },
  { merchant: "PIZZA HUT ROHRMOSER", city: "San Jose", brand: "AMEX", last4: "1001", amount: "CRC 14,350.00" },
  { merchant: "PRICESMART ZAPOTE", city: "San Jose", brand: "MASTER", last4: "8810", amount: "CRC 61,200.00" },
  { merchant: "TIENDA UNIVERSAL", city: "San Jose", brand: "VISA", last4: "1205", amount: "CRC 18,990.00" },
  { merchant: "KOLBI RECARGAS", city: "San Jose", brand: "VISA", last4: "1205", amount: "CRC 10,000.00" },
];

export async function ensureDemoUser(): Promise<string> {
  const existing = await queryOne<{ id: string }>("SELECT id FROM users WHERE email = $1", [DEMO_EMAIL]);
  if (existing) return existing.id;
  const userId = await createUser({ email: DEMO_EMAIL, name: "Demo", passwordHash: null, lang: "es", isDemo: true });
  await fillDemo(userId);
  return userId;
}

export async function resetDemo(userId: string): Promise<void> {
  for (const table of ["review_items", "transactions", "merchant_memory", "concept_memory", "cards", "processed_emails"]) {
    await query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
  }
  await fillDemo(userId);
}

async function fillDemo(userId: string): Promise<void> {
  const now = crNow();
  // Seed only past days so freshly simulated emails show up first in "latest transactions".
  const daysSoFar = Math.max(1, now.getUTCDate() - 1);
  const day = (i: number) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1 + (i % daysSoFar)));

  // Leave the last two purchases unconfirmed so the "Avisos" screen has something to show.
  for (const [i, p] of PURCHASES.entries()) {
    const result = await ingestEmail({
      userId,
      text: purchaseEmail({ ...p, auth: 300100 + i, day: day(i), time: `${8 + (i % 12)}:${String((i * 7) % 60).padStart(2, "0")}` }),
    });
    if (result.status === "created" && i < PURCHASES.length - 2 && result.classification.categoryId) {
      await learn(userId, result.transactionId, result.classification.categoryId);
    }
  }

  const salary = await ingestEmail({
    userId,
    text: sinpeEmail({ from: "EMPRESA DEMO S.A.", account: "1001", amount: "650.000,00 CRC", concept: "Salario quincena", ref: "2026000000001", day: day(0) }),
  });
  if (salary.status === "created" && salary.classification.categoryId) {
    await learn(userId, salary.transactionId, salary.classification.categoryId);
  }
  await ingestEmail({
    userId,
    text: sinpeEmail({ from: "MARIA DEMO QUIROS", account: "1001", amount: "7.500,00 CRC", concept: "Sin Descripcion", ref: "2026000000002", day: day(1) }),
  });
  await query("UPDATE cards SET nickname = 'Walmart' WHERE user_id = $1 AND last4 = '8810'", [userId]);
  await query("UPDATE cards SET nickname = 'Débito' WHERE user_id = $1 AND last4 = '1205'", [userId]);
}
