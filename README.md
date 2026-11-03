# Spend Traker

Gastás con tu tarjeta BAC y la app lo anota sola. Lee (solo lectura) los correos del BAC en tu Gmail —compras, SINPE y pago de servicios—, los clasifica en tus categorías y te avisa cuando algo necesita tu confirmación. Cada vez que corregís algo, aprende.

## Correr en tu compu

```bash
npm install
npm run dev
```

Abrí http://localhost:3000 y tocá **Entrar como demo**. No hace falta configurar nada: se usa una base de datos embebida (carpeta `.data/`).

Para probar el flujo principal sin Gmail: en **Inicio** usá **Simular correo BAC**.

Pruebas automáticas:

```bash
npm test
```

## Qué hace falta para producción

Copiá `.env.example` a `.env.local` (en local) o cargá las mismas variables en Vercel → Project → Settings → Environment Variables.

| Variable | Para qué |
| --- | --- |
| `DATABASE_URL` | Postgres de Neon (Vercel Marketplace → Neon) |
| `SESSION_SECRET` | Firma las sesiones. Obligatoria en producción |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Botón **Conectar Gmail** |
| `GOOGLE_PLACES_API_KEY` | Reconocer comercios nuevos (opcional) |
| `AI_GATEWAY_API_KEY` | Clasificar con IA (en Vercel no hace falta: usa OIDC) |
| `CRON_SECRET` | Protege la sincronización diaria |

Sin IA ni Places la app funciona igual: usa reglas por palabras clave y lo que aprendió; lo dudoso va a **Avisos**.

## Desplegar en Vercel

1. Subí esta carpeta a un repo (GitHub) e importalo en [vercel.com/new](https://vercel.com/new).
2. En el proyecto: **Storage → Neon → Create** (eso crea `DATABASE_URL` solo).
3. **AI Gateway**: en el dashboard del equipo, activalo. En producción la app se autentica sola.
4. Cargá `SESSION_SECRET` y `CRON_SECRET` (cualquier texto largo aleatorio: `openssl rand -base64 32`).
5. Deploy. Las tablas se crean solas en la primera visita.

O desde la terminal: `npx vercel link`, `npx vercel env pull`, `npx vercel --prod`.

## Configurar Gmail (Google Cloud)

1. [console.cloud.google.com](https://console.cloud.google.com) → crear proyecto → **APIs y servicios → Biblioteca** → habilitar **Gmail API**.
2. **Pantalla de consentimiento OAuth**: tipo *Externo*, agregá el scope `https://www.googleapis.com/auth/gmail.readonly` y, mientras esté en modo prueba, agregá como **usuarios de prueba** los Gmail que van a usar en la demo.
3. **Credenciales → Crear ID de cliente OAuth** → *Aplicación web*. URI de redirección autorizada:
   - `http://localhost:3000/api/gmail/callback`
   - `https://TU-APP.vercel.app/api/gmail/callback`
4. Copiá el ID y el secreto a `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`.

La sincronización corre al abrir **Inicio** (si pasaron más de 2 minutos), con el botón **Revisar Gmail ahora** y una vez al día por cron (`vercel.json`).

**Plan B sin Gmail OAuth:** en **Ajustes** cada usuario tiene una dirección web secreta. Cualquier servicio de reenvío puede hacer `POST` ahí con `{ from, subject, html }` o el texto del correo.

## Seguridad

- Gmail en **solo lectura** (`gmail.readonly`); el token se guarda cifrado (AES-256-GCM).
- Solo se procesan correos de `@baccredomatic.com` y `@notificacionesbaccr.com`; el resto ni se abre.
- Nunca se entra a la banca en línea ni se piden claves del banco.
- Cada correo se procesa una sola vez (no hay movimientos duplicados).

## Guion de demo (3 minutos)

1. **(0:00) Problema.** "Nadie anota sus gastos. El BAC ya te manda un correo por cada compra; nosotros lo aprovechamos."
2. **(0:20) Landing.** Mostrar los tres puntos de confianza: solo lectura, solo correos del BAC, nunca la clave del banco.
3. **(0:40) Entrar como demo → Inicio.** Gastado vs. tope en colones y dólares, barras por categoría, Supermercado pasado del tope.
4. **(1:10) Simular correo BAC → "Compra AMEX · Dunkin" → Simular llegada.** Aparece al toque en Restaurantes, con 0 tokens: lo aprendió de antes.
5. **(1:30) Simular "SINPE recibido · Sin descripción".** Cae en **Avisos**. Escribir el concepto ("alimentación"), elegir Supermercado, Guardar. "La próxima vez lo hace sola."
6. **(2:00) Movimientos.** Filtrar por tarjeta (AMEX 4743 vs. MASTER 3771) y abrir **Detalle**: fuente, confianza y costo de IA.
7. **(2:20) Ajustes.** Comercios aprendidos y costo total de IA: "cuanto más se usa, menos tokens gasta".
8. **(2:40) Cierre.** Si hay Gmail real conectado: **Revisar Gmail ahora** y mostrar una compra de verdad.

Antes de presentar: **Ajustes → Reiniciar datos demo**. Grabá un video de respaldo de este mismo recorrido por si falla el wifi.
