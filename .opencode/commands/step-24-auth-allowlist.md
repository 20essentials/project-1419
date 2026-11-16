---
name: "Step 101 — Auth en producción (allow-list workers.dev, sin dominio propio)"
goal: "Dejar el roundtrip de auth (login, signup, password reset, logout) funcionando en https://nami-sushi.nami-sushi.workers.dev sin dominio propio, registrando la URL real en la allow-list del OAuth app de Wix."
---

# Step 101 — Auth en producción (allow-list workers.dev)

Paso **pendiente**: se ejecuta tras step-100. **Decisión cerrada:** no habrá dominio propio; la URL pública y canónica es `https://nami-sushi.nami-sushi.workers.dev/`. Este step sustituye al antiguo “dominio propio”: lo único que queda por cerrar es que Wix acepte los redirects de auth en esa URL.

## Precondiciones

- Step-100 hecho: Worker publicado y sirviendo el sitio con canonical/hreflang/sitemap en la URL de workers.dev.
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
   - ROADMAP: fila 101 → ✅; README con la URL de producción y la nota de que no hay dominio propio.
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
