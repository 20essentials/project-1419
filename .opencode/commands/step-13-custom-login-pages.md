---
name: "Step 13 — Login/signup custom con Google y Facebook"
goal: "Páginas /login/ y /signup/ 100% Nami: email/contraseña (login/register del SDK) + botones Sign in with Google/Facebook (getAuthUrl idp) + callback client-side que convierte el fragment en cookies HttpOnly."
---

# Step 13 — Login/signup custom con Google y Facebook

## Precondiciones

- Step-12 (infra de sesión: `/api/auth/*` y cookies).
- Doc obligatorio: https://dev.wix.com/docs/go-headless/authentication/members/identity-providers/sign-in-with-google-or-facebook-js-sdk.md
- Receta project-1415: `how-to-code-members-custom-login.md`.
- Redirect URIs en allow-list (step-02) para: `/auth/callback` (social), `/api/auth/callback` (email redirect), dominios dev/prod.

## Objetivo

Cero marca Wix en el login: form propio + ambos proveedores sociales funcionando, sesiones quedando en la misma cookie del step-12.

## Pasos

1. **Páginas**
   - `src/pages/login/index.astro` y `src/pages/signup/index.astro` (con estado via query `?error=`, `?returnTo=`).
   - Header/footer Nami; copy con `t('auth.*')` (login, signup, reset, social buttons, errores).
2. **Flujo email/contraseña (server, evita iframe)**
   - Forms POST a `/api/auth/password-login` y `/api/auth/password-register` (nuevas rutas server con OAuthStrategy sin tokens).
   - Server llama `auth.login(email, password)` / `auth.register(...)` (+ `processVerification()` si el registro lo pide) → si el estado es exitoso, `getMemberTokensForDirectLogin(state)` NO funciona en móvil (iframe oculto): **usar full-page redirect**. Para login directo: el server setea la cookie de sesión vía `/api/auth/session` y hace redirect 303 al `returnTo`.
   - Decisión del paso: si el login directo por email funciona bien en móvil con la variante de full-page redirect, usarla; si no, reutilizar el redirect flow de `/api/auth/login` (step-12). El callback `/auth/callback` puede ser compartido por ambos caminos.
3. **Botones Google/Facebook (client-side, doc identidad)**
   - Script inline/isla que en click:
     ```js
     const loginRequestData = client.auth.generateOAuthData(callbackUri, originalUrl);
     localStorage.setItem('wixOAuthData', JSON.stringify(loginRequestData));
     const { authUrl } = await client.auth.getAuthUrl(loginRequestData, { idp: 'google' });
     window.location.href = authUrl;
     ```
     (idp `'facebook'` para el otro button; el client se crea en JS con OAuthStrategy clientId público).
   - Estilo: botones con logos SVG locales de Google/Facebook, look Nami; sin scripts de terceros de los proveedores (Wix corre el OAuth).
4. **Callback página client-side `/auth/callback/index.astro`**
   - Página con script inline (el fragmento `#code&state` no llega al server):
     - `parseFromUrl()` → si `error` → redirect `/login/?error=...`.
     - `getMemberTokens(code, state, oAuthData)` con el wixOAuthData del `localStorage`.
     - `POST /api/auth/session` (fetch con credentials same-origin) con los tokens → tras 204, redirect al `originalUrl` (guardado en oAuthData con el returnTo).
   - Limpiar `wixOAuthData` de localStorage tras el éxito.
5. **Reset password**
   - `auth.sendPasswordResetEmail(email, returnTo)` desde un form propio (los emails de reset los manda Wix).
6. **Verificación UX**
   - Sign up con verificación de email: manejar los estados del StateMachine que devuelve `register()` con pantallas Nami propias (pending / confirmé / error).
7. **Cleanup**
   - Borrar route temporal del step-12 si queda.

## Criterios de aceptación

- Registro/login por email funciona web y mobile-emulado (drop de getMemberTokensForDirectLogin).
- Sign in con Google y con Facebook termina con cookie `wix-session` y el usuario en la página que pidió (`?returnTo=` respected).
- Logout cubre también el caso de session social.
- Sin marca Wix visible en el flujo (la página callback puede mostrar spinner Nami).

## Notas

- `getMemberTokensForDirectLogin()` usa un iframe oculto: prohibido en móvil. Si se emplea, solo desktop y con nombre de función explícito que lo deje claro.
- Revisar en dev que ningún token acaba en `document.cookie` legible por JS (la sesión va HttpOnly).
- Liberar puerto al terminar.

## Resultado

**Ejecutado el 11/11/2026.** Ver también ROADMAP.md (detalle histórico).

**Archivos**
- `src/features/auth/auth-flow.ts`: handlers server (`handlePasswordLogin/Register/Verify/Reset`), `beginMemberSession()` (redirect-session), `routeStateMachine()` (mapea estados a redirects), guard `isSameOrigin` (403), `failureRedirect` con params sanatizados.
- `src/features/auth/auth-page.astro`: UI única para login/signup (props `mode`, `returnTo`). Estados por query: form principal, `?verify=required` (código 6 dígitos), `?reset=1` (form reset), `?reset=sent` (panel neutro), `?error=` (banner role=alert), `?email=` prefill. Payload JSON `[data-auth-config]` (clientId + captchaSiteKey + callbackPath + returnTo + loginPath). SVGs Google/Facebook inline. Sin `getMemberTokensForDirectLogin`.
- `src/features/auth/auth-client.ts`: carga reCAPTCHA Enterprise con la site key invisible de Wix y en submit pone token en input `captchaToken`; botones `[data-idp]` → `generateOAuthData` → `localStorage['wixOAuthData']` → `getAuthUrl(oauthData, {idp})` → `location.href`.
- `src/features/auth/callback-page.astro` + `callback-client.ts`: parsea el fragment, valida `state` contra localStorage, `getMemberTokens` → `POST /api/auth/session` → limpia localStorage → `location.replace(originalUri)` (validado path local). Errores → `?error=oauth_callback|oauth_state|oauth_failed|access_denied|oauth_error`.
- Páginas finas SSR (no prerender, noindex): `pages/login/index.astro`, `pages/signup/index.astro` (redirect a returnTo si hay sesión), `pages/auth/callback/index.astro` (sin header).
- Rutas API: `pages/api/auth/password-{login,register,verify,reset}.ts` (form POST nativo, no-JS friendly).
- `shared/auth/session.ts`: +`VERIFY_COOKIE 'wix-verify'` (10 min) con `read/write/clearVerifyData`. `shared/wix/member-client.ts`: +módulo `redirects`. `app/footer.astro`: +link login (`footer.login`).
- Tests: `src/tests/auth-pages.spec.ts` (9 verdes).

**Hallazgos**
- **Móvil / login directo**: `getMemberTokensForDirectLogin` usa iframe oculto (prohibido en móvil, confirmado). Se usa en su lugar el full-page redirect: `auth.login/register` → en SUCCESS, `redirects.createRedirectSession({ auth: { authRequest: { sessionToken, responseMode: 'query', ... }, prompt: 'none' } })` → 303 → Wix authorize → `/api/auth/callback?code&state` (ruta step-12 reutilizada) → cookie + 303 returnTo. Probado real end-to-end con signOn: sesión OK en `/api/dev/auth-check` y visit `/login/` logueado → 303 returnTo.
- **Captcha**: este sitio Wix exige reCAPTCHA en register (`auth.register` → FAILURE `missingCaptchaToken`; el login no lo exige salvo bots). Solución: script `recaptcha/enterprise.js` con la site key invisible que expone `OAuthStrategy.captchaInvisibleSiteKey` (`6LdoPaUfAAAAAJphvHoUoOob7mx0KDlXyXlgrx5v`), token en submit → `captchaTokens: { invisibleRecaptchaToken }` (aceptado por `auth.login` y `auth.register`, mismo `LoginParams`). `@wix/captcha` NO hace falta (es para backend `Authorize`).
- **`StateMachine`/`LoginState`**: exportados desde `@wix/sdk` (re-export de `./auth/oauth2/types.js`). `processVerification(nextInputs, state?)` acepta el `stateToken` guardado para continuar el flujo en una nueva instancia de client (verificación email). Estados del union: `SILENT_CAPTCHA_REQUIRED`/`USER_CAPTCHA_REQUIRED` además de los esperados → mapeados a error genérico.
- **Allow-list**: `sendRecoveryEmail` exige el redirect URI (`/login/`) en `allowedRedirectUris` → PATCH añadió 9 URIs (3 locales `/login|/es/login|/it/login` × localhost/namicrestaurant.com/www) con `client_credentials` + `mask.paths`. Verificado real: reset con email válido → `?reset=sent` y sin excepción.
- **SignOn admin**: `authentication.signOn` NO funciona con API key (403) ni con `ApiKeyStrategy`; sí con Bearer token de `client_credentials`. Detección del módulo: `createClient({ modules: { authentication }, ... })` (importar `authentication` de `@wix/identity`; pasar `true` no lo wirea).
- **Códigos de error mapeados** (`?error=`): invalidEmail, invalidPassword (contraseña mala real → invalidPassword), emailAlreadyExists, resetPassword (auto-envía reset email), invalidCode, ownerApproval (banner pending), access_denied (cancelación social), generic (resto, incl. captcha); `oauth_start/callback/state/failed/error` → generic en UI.
- **Mock del redirect-session en e2e**: la respuesta debe incluir `urlDetails.endpoint` (`getAuthUrl` lo desestructura) o el SDK lanza. URL real del endpoint: `https://www.wixapis.com/_api/redirects-api/v1/redirect-session`; token: `https://www.wixapis.com/oauth2/token`.
- **Preview**: solo escucha en `[::1]` (IPv6); los tests Playwright usan localhost y conectan, pero los scripts node standalone deben usar `http://[::1]:4321/`.

**Verificación**
- Build (`pnpm build` con Node 24.22.1 portable) + preview: login/signup/callback 200 en en/es/it; copy localizado; banner de error traducido.
- Smoke real (Node): register/ login negativos → 303 con error correcto; origin ajeno → 403; `returnTo=//evil.test` → sanatizado a `/account/`; verify sin cookie → generic; reset real (sendRecoveryEmail con `/login/` en allow-list) → `reset=sent`; flujo signOn → redirect-session → callback → `wix-session` → auth-check `loggedIn:true` → visit `/login/` → 303 returnTo.
- E2E Playwright: `src/tests/auth-pages.spec.ts` 9/9 verdes (render 3 locales, payload con clientId, estados verify/reset/sent/error, forgot→reset→back, login real contraseña mala → banner, social mocked completo → cookie real `wix-session` + auth-check loggedIn + localStorage limpio + logged-in visit redirect, callback sin fragment → oauth_callback, state mismatch → oauth_state + localStorage limpio, access_denied → banner, signup minlength 8 + nota legal + switch).
- Suite completa: 19 passed + 1 skipped (contract real opt-in). Typecheck focalizado: sin errores en los archivos nuevos (el repo arrastra errores previos ajenos).
- i18n: 50 claves (390 en) → `translations:push` OK → seed es/it REST (translation-content bulk, 100/100) → pull roundtrip OK (es/it 388/390; 2 faltantes preexistentes de carta, step-10).

**Pendiente / parket**
- El flujo real con Google/Facebook requiere registrar las conexiones de IdP en el dashboard de Wix (Connections) y cuentas reales; no automatizable — verificado con mocks y con la infraestructura real de tokens/sesión.
- Verificación de email real: el código llega al email del miembro; el flujo `?verify=required` + `processVerification` está implementado y probado la lógica, no el email real (member de prueba).
- Signup con captcha real en producción depende de que Google reCAPTCHA puntúe bien el navegador del usuario; si falla, error genérico (mensaje claro).
