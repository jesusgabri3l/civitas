# Suggest a monument: puesta en marcha

> **Estado (4 nov 2026): ya está hecho y en producción.** Esta guía queda como referencia para rotar claves o rehacer el setup. Lo que existe:
> - GCP `civitas-513317`: Sheets API activa, cuenta de servicio `civitas-suggest@civitas-513317.iam.gserviceaccount.com` (clave JSON id `375b4f91…`; el JSON se borró tras copiarlo a `.env.local`). Revocar: `gcloud iam service-accounts keys delete 375b4f91fadd583c67a111d2744f77f27d137387 --iam-account civitas-suggest@civitas-513317.iam.gserviceaccount.com --project civitas-513317`.
> - Sheet `1oQpHq1sLs2szruBRJHQNjAw2a-ugX0Jajg9JbafXtRU`, compartido con la cuenta de servicio como Editor.
> - Cloudflare Turnstile: widget con `visitcivitas.com` y `localhost`, site key `0x4AAAAAAF0D1Kx0Vt9KBlDj` (la secret solo está en Vercel).
> - Vercel (Production): las 5 variables. `PUBLIC_TURNSTILE_SITE_KEY` como tipo `config` (Vercel la frena si se añade como secret con prefijo `PUBLIC_`).
> - `.env.local`: Google reales + claves de **prueba** de Turnstile.

Flujo: formulario (`TheOverlaySuggest.vue`) → `POST /api/suggest` (función de Vercel, `src/pages/api/suggest.ts`) → verifica Cloudflare Turnstile → añade una fila a un Google Sheet. Variables en `.env.example`.

## 1. Google Sheet y cuenta de servicio

1. En [Google Cloud Console](https://console.cloud.google.com) crea un proyecto (o usa uno) y activa **Google Sheets API** (APIs y servicios → Biblioteca).
2. IAM y administración → **Cuentas de servicio** → Crear. Sin roles.
3. Dentro de la cuenta: Claves → Agregar clave → **JSON**. Se descarga un archivo.
4. Del JSON saca `client_email` (será `GOOGLE_SERVICE_ACCOUNT_EMAIL`) y `private_key` (será `GOOGLE_PRIVATE_KEY`).
5. Crea un Google Sheet nuevo. La primera hoja recibe las filas: fecha ISO, monument, place, why, email. Puedes poner encabezados en la fila 1.
6. **Compártelo** con el `client_email` como Editor.
7. El id del Sheet es el trozo largo de la URL: `docs.google.com/spreadsheets/d/<ESTE>/edit` (será `GOOGLE_SHEET_ID`).

`GOOGLE_PRIVATE_KEY` va en una sola línea, con los saltos de línea como `\n` literales y entre comillas en `.env.local`, tal como viene en el JSON (`"-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`).

## 2. Cloudflare Turnstile

1. [dash.cloudflare.com](https://dash.cloudflare.com) → Turnstile → Add widget.
2. Dominios: `visitcivitas.com` y `localhost`. Modo Managed.
3. Copia el **Site Key** (`PUBLIC_TURNSTILE_SITE_KEY`) y el **Secret Key** (`TURNSTILE_SECRET_KEY`).

Para probar en local sin captcha real, Cloudflare tiene claves de prueba: site key `1x00000000000000000000AA` y secret `1x0000000000000000000000000000000AA` (siempre pasan).

## 3. Variables en local

Copia `.env.example` a `.env.local` y llena las cinco: `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_SHEET_ID`. `.env.local` ya está en `.gitignore`.

## 4. Variables en Vercel

Una por una, para Production (y Preview si quieres probar ramas):

```
npx vercel env add PUBLIC_TURNSTILE_SITE_KEY
npx vercel env add TURNSTILE_SECRET_KEY
npx vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL
npx vercel env add GOOGLE_PRIVATE_KEY
npx vercel env add GOOGLE_SHEET_ID
```

`PUBLIC_TURNSTILE_SITE_KEY` se incrusta al compilar: tras añadirla hay que volver a desplegar. Al pegar `GOOGLE_PRIVATE_KEY` en la consola, pégala con los `\n` literales y sin comillas.

## 5. Probar en local

- `npm run dev` ya sirve `/api/suggest` leyendo `.env.local`. Abre el índice → Suggest a monument, envía y mira la fila en el Sheet.
- `npx vercel dev` reproduce el entorno de Vercel (pide `vercel link` la primera vez y usa las variables de Vercel).

Respuestas del endpoint: 200 enviado (también si el honeypot venía lleno, sin guardar), 400 datos inválidos o captcha fallido, 500 error de Google o variables que faltan (el detalle sale en la consola del servidor).

## Qué hace el servidor

- Solo acepta JSON de hasta 4 KB; solo lee `monument`, `place`, `why`, `email`, `token`, `website`; recorta y quita caracteres de control.
- Máximos: 200 caracteres (monument, place, email) y 1000 (why). Email con formato válido si viene.
- Valores que empiezan con `=`, `+`, `-` o `@` se guardan con un `'` delante (evita fórmulas). Se escribe con `valueInputOption=RAW`, así que el `'` se ve en la celda.
