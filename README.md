# Spend Traker

Spend Traker anota en el presupuesto las compras, transferencias SINPE y pagos de servicios que el BAC Credomatic manda por correo. El usuario confirma lo dudoso; la próxima vez el mismo comercio o concepto entra solo.

**Demo en producción:** [https://spend-traker-p5vv.vercel.app](https://spend-traker-p5vv.vercel.app)

## Abrir la demo (jurado)

1. Entrá a [https://spend-traker-p5vv.vercel.app](https://spend-traker-p5vv.vercel.app).
2. Tocá **Entrar como demo** (no hace falta crear cuenta).
3. En **Inicio** vas a ver el mes: categorías, montos y lo que queda.
4. Usá **Simular correo BAC** para meter un aviso de compra/SINPE/servicio sin Gmail.
5. Revisá **Movimientos**, **Avisos** (si algo quedó sin categoría segura) y **Ajustes**.

La cuenta demo comparte datos y se puede reiniciar desde Ajustes. No conecta Gmail.

## Guion de demo (~3 minutos)

1. **Landing (15 s)** — Mostrar marca Spend Traker y el botón de demo.
2. **Entrar como demo (20 s)** — Entrar sin registro; banner de cuenta demo.
3. **Inicio (60 s)** — Topes por categoría y saldo del mes. Simular un correo BAC (compra o SINPE) y mostrar cómo aparece el movimiento.
4. **Movimientos / Avisos (40 s)** — Filtrar o abrir un movimiento; si hay aviso pendiente, confirmar categoría.
5. **Confianza Gmail (40 s)** — En Ajustes explicar: solo lectura (`gmail.readonly`), no pide la clave del banco, no envía ni borra correos. La demo no conecta Gmail; un usuario real sí.
6. **Tema claro/oscuro (15 s)** — Alternar tema sin romper la pantalla.

## Confianza Gmail (solo lectura)

- Scope: `https://www.googleapis.com/auth/gmail.readonly`.
- La app **no** pide la clave del banco y **no** puede enviar, borrar ni modificar correos.
- Busca avisos de `@baccredomatic.com` y `@notificacionesbaccr.com`.
- El token de Gmail se guarda cifrado. La cuenta demo no conecta Gmail (usa simulación + datos sembrados).

## Correr en local

```bash
npm install
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000). Sin variables, usa una base embebida en `.data/`.

```bash
npm test
```

## Variables de entorno

Copiá `.env.example` a `.env.local`. **No subas secretos al repo.**

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres (Neon en producción). Vacío = PGlite local |
| `SESSION_SECRET` | Firma la sesión (obligatoria en producción) |
| `ENCRYPTION_KEY` | Opcional; si falta, se deriva de `SESSION_SECRET` |
| `CRON_SECRET` | Autoriza el cron diario de Gmail |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth Conectar Gmail |
| `APP_URL` | URL pública (retorno de Google) |
| `GOOGLE_PLACES_API_KEY` | Opcional; reconocer comercios |
| `AI_GATEWAY_API_KEY` | Solo fuera de Vercel; en Vercel alcanza OIDC |
| `AI_MODEL` | Modelo (por defecto Gemini vía AI Gateway) |

Sin Google OAuth el registro y el presupuesto funcionan; el correo no se conecta. Sin IA clasifican reglas y memoria; lo dudoso va a Avisos.

## Documentación del equipo

- [PRODUCT.md](./PRODUCT.md) — propósito, marca y principios del producto.
- [docs/](./docs/) — índice y PDFs de sprints en `docs/sprints/`.

## Stack

Next.js (App Router), Postgres (Neon / PGlite), Vercel (hosting + cron), Google OAuth Gmail readonly, Vercel AI Gateway (clasificación opcional).
