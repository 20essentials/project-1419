---
name: "Step 12 — Núcleo de auth de miembros"
goal: "Infra de sesión server-side: cookies HttpOnly con los tokens OAuth, endpoints /api/auth/*, cliente SSR con OAuthStrategy(tokens), renew silencioso y logout."
---

# Step 12 — Núcleo de auth de miembros

## Precondiciones

- Step-02 hecho (client ID y redirect URIs registrados en Headless Settings).
- Receta de referencia project-1415: `how-to-code-members-custom-login.md`.

## Objetivo

El flujo termina con los tokens del miembro guardados en una cookie HttpOnly, y el SSR crea el cliente con `OAuthStrategy({ clientId, tokens })` para llamar APIs como ese miembro.

## Pasos

1. **Sesión (cookie = almacén)**
   - `src/auth/session.ts`: serializar/deserializar tokens (access + refresh + role) en cookie HttpOnly, Secure en prod, SameSite=Lax, nombre `wix-session`.
   - Helper para páginas SSR: si hay cookie válida → construir `createClient({ auth: OAuthStrategy({ clientId, tokens }), modules })`; si no → visitante anónimo (sin tokens).
   - La cookie vive junto al refresh token (larga); el role del refresh debe ser `member`.
2. **`POST /api/auth/session`**
   - Recibe los tokens crudos generados en el cliente (del callback del step-13: el fragment de OAuth no llega al server). Los guarda en la cookie y responde 204. Sin tokens válidos → 400.
3. **`GET /api/auth/login`** (redirect Wix-hosted opcional + utilitario)
   - `generateOAuthData(callbackUri, returnTo)` → `getAuthUrl(...)` (sin `idp`) → redirect. Necesita guardar `state`/`codeVerifier` en una cookie temporal corta para el callback.
4. **`GET /api/auth/callback`**
   - Para el path server-side con `code` en el query: valida la cookie de `state`, llama `getMemberTokens(code, state, oAuthData)` → setea cookie de sesión → redirect al `returnTo` (default `/account/`).
   - Errores del proveedor/Wix: redirect a `/login/?error=...` (código mapeado y traducido en UI, nunca detalles crudos).
5. **`POST /api/auth/logout`**
   - Borra la cookie de sesión (+ temporales) y, si hay tokens, redirect al `getLogoutUrl(...)` de Wix. Experiencia: volver a `/`.
6. **Renew silencioso**
   - En cada request SSR con sesión: si `accessToken.expiresAt` está vencido, `auth.renewToken(refreshToken)` (o el método SDK correspondiente) y re-setear la cookie. Si falla → tratar como no-logueado y limpiar cookie.
7. **Seguridad del server**
   - Ningún endpoint de auth devuelve tokens en el body de la respuesta. Revisar JSON/headers en dev.
   - La API key sigue solo en endpoints admin (`/api/reserve`, menus); auth de miembros va 100% con OAuthStrategy.

## Criterios de aceptación

- Test manual del redirect login → callback → cookie set → página de prueba SSR reconoce al miembro (`getCurrentMember` funciona) → logout (form) → cookie borrada y estado visitante.
- Redirect URIs de la allow-list (step-02) funcionan en `wrangler dev`.
- Sin comentarios; archivos kebab-case; sin `export default` (API routes usan `export const GET/POST`).

## Notas

- La UI de login/signup va en step-13; este step es solo infra (testeable con una ruta temporal de dev).
- La cookie de sesión es técnica: no requiere consentimiento (banner de cookies si aplica).
- Liberar puerto al terminar el paso.

## Resultado

Ejecutado el 2026-11-11. Infra de sesión server-side lista y verificada contra Wix real.

**Archivos**
- `src/shared/auth/session.ts`: cookie `wix-session` (HttpOnly, SameSite=Lax, `Secure` según proto del request, 30 días) con tokens serializados en base64url; cookie temporal `wix-oauth` (10 min) con `OauthData` (state + PKCE); `getMemberSession()` renueva el access token vencido con `auth.renewToken(refreshToken)` y limpia la cookie si falla; `safeReturnTo()` bloquea `//`, `\` y saltos de línea.
- `src/shared/auth/http.ts`: redirects `no-store`, `requestOrigin()` (respeta `x-forwarded-proto`), `isSameOrigin()`, helper de `/login/?error=`.
- `src/shared/wix/member-client.ts`: `getMemberClient(tokens?)` = `createClient({ auth: OAuthStrategy({ clientId, tokens }), modules: { members } })`. La API key no se usa en auth de miembros.
- `src/pages/api/auth/login.ts` (GET), `callback.ts` (GET), `session.ts` (POST), `logout.ts` (POST).
- `src/pages/api/dev/auth-check.ts`: ruta de humo SSR que llama `getCurrentMember({ fieldsets: ['FULL'] })` y devuelve solo id/email/nickname (nunca tokens).

**Contrato**
- `GET /api/auth/login?returnTo=/es/account/` → 302 a Wix con `responseMode=query` + cookie `wix-oauth`; `returnTo` no local cae a `/account/`.
- `GET /api/auth/callback?code&state` → valida state contra la cookie, `getMemberTokens()` → cookie `wix-session` → 303 al `returnTo`; errores → 302 a `/login/?error=oauth_state|oauth_callback|oauth_failed|access_denied|oauth_error|oauth_start`. Nunca devuelve tokens.
- `POST /api/auth/session` (JSON `{ tokens }` o tokens planos) → 204 sin body; valida shape (refresh role `member`), `Content-Type` JSON y mismo origin (403 si no).
- `POST /api/auth/logout` → borra `wix-session` + `wix-oauth`; con sesión redirige al logout de Wix (post-logout `/`) y sin sesión a `/`.
- Renew: `expiresAt` del SDK está en **segundos** (no ms); el helper compara contra `Math.floor(Date.now()/1000) + 60`.

**Allow-list OAuth (hallazgo y fix)**
- `allowedRedirectUris` estaba **vacío** en el OAuth app (`oauth-app/v1`), por lo que Wix devolvía `400 Invalid redirect URI` al autorizar. Se registró vía `PATCH` con `client_credentials` (la API key da 403):
  - URIs: `http://localhost:4321/api/auth/callback`, `http://localhost:4321/auth/callback`, `https://namicrestaurant.com/api/auth/callback`, `https://namicrestaurant.com/auth/callback` (+ variantes `www.`).
  - Domains: `localhost:4321`, `namicrestaurant.com`, `www.namicrestaurant.com` (necesarios para el post-logout redirect).
  - El `PATCH` exige `mask.paths` o no-op silencioso. Las URIs de `/auth/callback` quedan listas para el social login del step-13.

**Verificación** (`pnpm astro build && pnpm preview`, Node 24.22.1)
- `GET /api/auth/login` → 302 a Wix, cookie `wix-oauth` compacta (base64url), sin tokens en body.
- Flujo completo real: se obtuvo un authorization code real con PKCE + `signOn` (miembro de prueba `auth-smoke@namicrestaurant.com`) → `/api/auth/callback` → 303 `/es/account/` + cookie `wix-session` → `/api/dev/auth-check` 200 con `loggedIn:true` y email del miembro (`getCurrentMember` OK).
- Renew: cookie con access vencido → auth-check 200, `Set-Cookie` nuevo con `expiresAt` a 14400 s y refresh role `member`.
- Logout con sesión real → 303 al logout de Wix, que vuelve a `http://localhost:4321/`; cookies borradas.
- Negativos: tokens inválidos → 400; `Origin` ajeno → 403; state incorrecto → `oauth_state`; code inválido → `oauth_failed`; `returnTo=//evil.test` → `/account/`.
- Typecheck focalizado con `tsc --baseUrl .` sin errores en los archivos nuevos (el repo arrastra errores previos ajenos a este step).
- Puerto 4321 liberado al terminar.
