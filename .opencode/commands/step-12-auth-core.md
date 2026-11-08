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
