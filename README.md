# Spend Traker

Spend Traker anota en el presupuesto las compras, transferencias SINPE y pagos de servicios que el BAC Credomatic manda por correo. El usuario confirma lo dudoso. La próxima vez el mismo comercio o concepto entra solo.

## Cómo entra un movimiento

1. La persona crea una cuenta con correo y contraseña. La sesión queda en una cookie firmada.
2. Conecta el Gmail donde llegan los avisos del BAC. La app pide solo lectura (`gmail.readonly`). No pide la clave del banco y no puede enviar, borrar ni modificar correos.
3. Al abrir Inicio, al tocar **Revisar Gmail ahora**, o una vez al día, la app busca correos de `@baccredomatic.com` y `@notificacionesbaccr.com`.
4. De cada correo se leen fecha, monto, moneda, comercio o contraparte, concepto, ciudad, tarjeta y referencia.
5. La categoría sale, en este orden: memoria de correcciones anteriores, reglas por palabras, y si hace falta un modelo de lenguaje (Gemini a través de Vercel AI Gateway). Si no hay certeza, el movimiento queda en **Avisos**.
6. Cada correo se procesa una sola vez.

También se puede anotar a mano un gasto o un ingreso (efectivo, SINPE Móvil, transferencia bancaria o una tarjeta ya detectada), con fecha corregible.

## Datos que se guardan

Postgres (Neon en producción, archivo local en desarrollo): usuarios, categorías con tope mensual, tarjetas (marca y últimos 4), movimientos, memoria de comercios y conceptos, avisos pendientes y la conexión de Gmail. El token de Gmail se guarda cifrado.

## Correr en local

```bash
npm install
npm run dev
```

http://localhost:3000 usa una base embebida en `.data/`. La cuenta demo no conecta Gmail.

```bash
npm test
```

## Producción

Variables en Vercel:

| Variable | Uso |
| --- | --- |
| `DATABASE_URL` | Postgres de Neon |
| `SESSION_SECRET` | Firma la sesión. Obligatoria en producción |
| `CRON_SECRET` | Autoriza la sincronización diaria |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Botón Conectar Gmail |
| `APP_URL` | URL pública, para el retorno de Google |
| `AI_GATEWAY_API_KEY` | Solo fuera de Vercel. En Vercel el modelo se autentica solo |

Sin la clave de Google el registro y el presupuesto funcionan, pero el correo no se conecta. Sin el modelo, clasifican las reglas y la memoria; lo demás va a Avisos.

### Gmail

En Google Cloud: habilitar Gmail API, pantalla de consentimiento en modo prueba, scope `https://www.googleapis.com/auth/gmail.readonly`, y los correos de la demo como usuarios de prueba. Cliente OAuth web con redirección `https://TU-APP/api/gmail/callback` y `http://localhost:3000/api/gmail/callback`.

Make puede reenviar los correos de una sola cuenta a `POST /api/inbound/{token}` (el token está en Ajustes). No reemplaza Conectar Gmail para un usuario nuevo.
