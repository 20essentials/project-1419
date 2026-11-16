---
name: "Step 24 — Auth en producción (allow-list workers.dev, sin dominio propio)"
goal: "Dejar el roundtrip de auth (login, signup, password reset, logout) funcionando en https://nami-sushi.nami-sushi.workers.dev sin dominio propio, registrando la URL real en la allow-list del OAuth app de Wix."
---

# Step 24 — Auth en producción (allow-list workers.dev)

Paso **pendiente**: se ejecuta tras step-23. **Decisión cerrada:** no habrá dominio propio; la URL pública y canónica es `https://nami-sushi.nami-sushi.workers.dev/`. Este step sustituye al antiguo “dominio propio”: lo único que queda por cerrar es que Wix acepte los redirects de auth en esa URL.

## Precondiciones

- Step-23 hecho: Worker publicado y sirviendo el sitio con canonical/hreflang/sitemap en la URL de workers.dev.
- Acceso al OAuth app de Wix usado en step-02/12 (dashboard del app o API de app instance) para editar `allowedRedirectUris`/`allowedRedirectDomains`.
- Miembro de prueba disponible (email verificado) para probar signup/password reset.
- Navegador en incógnito para no arrastrar sesión local.

## Objetivo

- `https://nami-sushi.nami-sushi.workers.dev/api/auth/callback` aceptado por Wix como redirect URI exacto.
- Login, signup, password reset y logout vuelven a la URL de producción (no a localhost ni a `namicrestaurant.com`).
- Cookies de sesión con `Secure`/`HttpOnly`/`SameSite` coherentes sobre HTTPS.
- Gift checkout y reservas vuelven a la URL de producción.

## Pasos

1. **Inspeccionar la allow-list actual**
   - Localizar el app de Wix (`dcb89266-8d8c-4df3-ae46-b8772491bd28`) y anotar `allowedRedirectUris`/`allowedRedirectDomains` actuales.
   - Confirmar que `https://localhost:4321/api/auth/callback` sigue para dev.
2. **Añadir producción**
   - Añadir el redirect URI exacto `https://nami-sushi.nami-sushi.workers.dev/api/auth/callback`.
   - Si el app exige dominio (sin path), añadir `https://nami-sushi.nami-sushi.workers.dev` y `nami-sushi.nami-sushi.workers.dev`.
   - No borrar localhost: el login en `pnpm dev` lo necesita. Se pueden retirar los URIs de `namicrestaurant.com` si ya no se usan.
3. **Probar el roundtrip**
   - Incógnito: `/login/` → elegir proveedor → volver a `/account/` con sesión; comprobar cookie y nombre en el header.
   - `/signup/` con email nuevo de prueba → verificar y entrar; borrar el miembro al terminar.
   - `/login/?returnTo=/account/` conserva el destino; cancelar en Wix vuelve con `?error=access_denied`.
   - Logout desde el header → vuelve a home y limpia cookies.
   - Password reset: solicitar y comprobar que el enlace vuelve a la URL de producción.
4. **Flujos que dependen del origen**
   - Gift checkout: iniciar desde `/gift/` y confirmar que el retorno de Wix apunta a la URL de producción.
   - Reservas: completar un flujo de prueba y verificar el retorno.
5. **SEO y enlaces**
   - `curl` a `/`, `/menu/`, legales: canonical, hreflang, `og:url`, sitemap y JSON-LD con la URL de workers.dev.
   - `src/shared/site/nami.ts`: decidir si email/Instagram siguen en `namicrestaurant.com` (marca) — no es un requisito de este step, pero anotar la decisión.
6. **Cierre**
   - Documentar `## Resultado` con la allow-list final y las pruebas.
   - ROADMAP: fila 24 → ✅; README con la URL de producción y la nota de que no hay dominio propio.
   - Cerrar navegador/puertas: no dejar servidores ni puertos abiertos (AGENTS.md).

## Criterios de aceptación

- Login/signup/logout/password reset funcionan en `https://nami-sushi.nami-sushi.workers.dev` en incógnito.
- Wix no devuelve `redirect_uri` inválido ni `oauth_callback` en producción.
- Cookies de sesión correctas sobre HTTPS; `/account/` protegido sigue redirigiendo a login localizado con `returnTo`.
- Todos los outputs absolutos usan la URL de workers.dev.
- README/ROADMAP actualizados; sin secretos en el repo.

## Notas

- La callback se construye con el origen de la request (`src/pages/api/auth/login.ts`), así que la allow-list debe contener **exactamente** la URL de producción; no vale comodín si el app no lo soporta.
- Si el app de Wix no permite varios orígenes, usar un app de producción separado del de desarrollo (misma site) en vez de romper dev.
- No hay step de dominio: `namicrestaurant.com` queda solo como marca/email inventados; no añadir rutas ni redirects de dominio.
- Los textos legales ya usan `nami-sushi.nami-sushi.workers.dev` (en/es/it); el email `hola@namicrestaurant.com` se mantiene como contacto de marca.

## Resultado

🔶 En curso (2026-11-16) — todo el tramo automatizable está verificado contra producción real; queda el tramo humano del roundtrip.

- **Allow-list final** (leída con `GET oauth-app/v1/oauth-apps/{id}` usando `client_credentials` con los secretos de `.dev.vars` — el token del MCP da 403 por falta de scope `SCOPE.OAUTH_APP.READ`): `allowedRedirectUris` = 10 URIs, 5 de dev en `http://localhost:4321/...` y 5 de producción en `https://nami-sushi.nami-sushi.workers.dev/...` (`/api/auth/callback`, `/auth/callback`, `/login/`, `/es/login/`, `/it/login/`); `allowedRedirectDomains` = `localhost:4321` + `nami-sushi.nami-sushi.workers.dev`. Sin restos de `namicrestaurant.com` (retirados, como preveía el paso 2). El aviso "Not a valid domain" del dashboard es cosmético (AGENTS.md).
- **Verificado con curl contra producción** (https://nami-sushi.nami-sushi.workers.dev):
  - Rutas 200: `/`, `/menu/`, `/reserve/`, 4 legales, `/gift/`, `/login/`, `/signup/`, `/sitemap-index.xml`, `/robots.txt`. `/account/` → 302 a login localizado con `returnTo` (en/es/it).
  - Seguridad de origen: `returnTo` a dominio ajeno sanatizado (renderiza, no redirige); `/api/auth/callback` sin `code` → 302 a `/login/?error=oauth_callback` (sin 500); `/api/auth/session` POST vacío → 400; `/api/gift/checkout` con `Origin` ajeno → 403.
  - **Arranque OAuth**: `/api/auth/login` → 302 a la página hosted de Wix con `redirectUri=https://nami-sushi.nami-sushi.workers.dev/api/auth/callback` y Wix **la acepta** (emite authorize + sessionToken, sin error de redirect URI inválido).
  - SEO: canonical, hreflang (en/es/it/x-default) y `og:url` con la URL de producción.
  - `/api/reserve/setup` 200 completo: Europe/Madrid, `onlineReservationsEnabled` true, approval AUTOMATIC, partySize 1–8, notice 60 MIN, turnover 90, slotInterval 15, ventana 60 días, 2 experiencias (`short`/`full` del step-17).
- **Verificado en Chrome real (DevTools)**: `/login/` renderiza form email/password + botones Google/Facebook + enlace reset con `returnTo=/account/` + iframe reCAPTCHA enterprise cargado. Tabs cerradas y Chrome del MCP matado al terminar; sin restos `.tmp-step24-*` en la raíz.
- **Pendiente (tramo humano — el login email/password contra Wix no se puede automatizar: rechaza tokens reCAPTCHA generados por bots, AGENTS.md):**
  1. Login real en incógnito (Google con `d3m0ns300@gmail.com`, o un miembro con password conocida creado a mano) → volver a `/account/` con sesión y nombre en el header.
  2. Logout desde el header → home + cookies limpias.
  3. Signup con email nuevo de prueba → verificar por código → entrar → borrar el miembro al terminar (no inventar/borrar miembros sin permiso).
  4. Password reset: solicitar el enlace y comprobar que vuelve a la URL de producción.
  5. Gift checkout completo desde `/gift/` → hosted checkout de Wix → retorno a la URL de producción.
- Al cerrar el tramo humano: ROADMAP fila 24 → ✅ y resumen rápido → 24/24.
