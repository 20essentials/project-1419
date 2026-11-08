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
