---
name: "Step 14 — /account/ con perfil y órdenes"
goal: "Página /account/ SSR con getCurrentMember + listado de orders de @wix/ecom, edición de perfil y header dinámico según sesión."
---

# Step 14 — /account/ con perfil y órdenes

## Precondiciones

- Step-12/13 (sesión funcionando con email y social).
- Recetas project-1415: `step-24-member-order-history.md` y `step-29-member-profile.md` del repo (lectura conceptual).

## Objetivo

Un miembro logueado ve su cuenta: datos del perfil, sus órdenes (list) y puede cerrar sesión. Visitante no logueado → redirect a `/login/?returnTo=/account/`.

## Pasos

1. **Ruta y guard**
   - `src/pages/account/index.astro`: SSR (no prerender); si no hay sesión → redirect al login con `returnTo`.
2. **Perfil**
   - `members.getCurrentMember({ fieldsets: ['FULL'] })` con el client de sesión (OAuthStrategy tokens).
   - Datos visibles: nombre, email, pequeño avatar placeholder.
   - Editar perfil (apellido, phone, etc.) → `members.updateMember` vía `POST /api/account/profile` (server crea client con los tokens de cookie y llama a la API; member tokens permiten update propio).
3. **Órdenes**
   - Listado con `orders` de `@wix/ecom` (`orders.listOrders` / query paginado server-side con tokens del miembro): número, fecha, total, items summary, estado.
   - Estado vacío traducido (`account.orders.empty`).
4. **Subnav de account**
   - Tabs simples (Perfil / Órdenes) o secciones apiladas estilo Nami; móvil-first.
5. **Header dinámico**
   - `header.astro` recibe en SSR el estado de sesión (bool + nombre short): botón "Account" ↔ "Login" y link logout (form POST al endpoint del step-12).
6. **Copy**
   - Claves `account.*` y `auth.*` en translations.json + es/it via dashboard (push si hay claves nuevas).

## Criterios de aceptación

- Con sesión: `/account/` muestramember_data y sus órdenes (o vacío). Sin sesión: redirect a login con returnTo.
- Cada vista en `/es/account/` e `/it/account/` con su copy.
- Al comprar una gift card (step-15) la orden aparece automáticamente en la lista (validación en step-15).

## Notas

- Los tokens del miembro NO salen al client; las islas ya existentes no leerán auth salvo via data-attrs SSR.
- Sin comentarios; kebab-case; sin `export default` (páginas `.astro` y API routes exentos).
- Liberar puertos al terminar.

## Resultado

Ejecutado el 11/11/2026. `/account/` SSR con perfil editable, listado de órdenes y header dinámico, verificado contra Wix real.

**Archivos**
- `src/features/account/account-data.ts`: `getAccountProfile()` (`getCurrentMember({ fieldsets: ['FULL'] })` → id/nombre/email/teléfono/initials), `getAccountOrders()` (`orders.searchOrders` con filtro `buyerInfo.memberId` + `cursorPaging.limit` 20, mapea número/fecha ISO/total formateado/items `qty× nombre`/status, estado `ready|empty|error`) y `updateAccountProfile()` (update parcial: `{ contact: { firstName?, lastName?, phones? } }`; teléfono vacío con teléfono previo → `deleteMemberPhones`).
- `src/features/account/account-page.astro`: dos tarjetas glass (perfil con avatar initials + dl de datos + `<details class="faq">` con form de edición + logout; órdenes con filas número/fecha `Intl.DateTimeFormat` por locale/status pill/total, estado vacío con CTA a `/regalar/`, banner de error con `ordersError` prop). Banners `?saved=1` / `?error=profile|invalid` desde query.
- `src/pages/account/index.astro`: guard SSR (`getMemberSession` → sin sesión 302 a `/login/?returnTo=/account/` localizado), fetch de perfil (fallo → estado fatal traducido) y órdenes (fallo → `ordersError`), `noindex`, pasa `session` al Layout para el header.
- `src/pages/api/account/profile.ts`: POST mismo origen (403 si no), sesión requerida (303 a login + returnTo), validación de teléfono (`^[+()\d\s.-]{5,40}$` → `?error=invalid`), update parcial → `?saved=1`, excepciones → `?error=profile`.
- `src/shared/wix/member-client.ts`: +módulo `orders` de `@wix/ecom`.
- `src/app/layout.astro` + `src/app/header.astro`: prop `session` (solo páginas SSR la pasan) → header muestra botón Account (nombre corto truncado a 14) + form logout en sm+ y en el menú móvil; visitante ve Login. Footer sigue estático con su link de login.

**Contrato**
- `GET /account/` sin sesión → 302 `/login/?returnTo=%2Faccount%2F` (con locale delante).
- `GET /account/` con sesión → 200 perfil + órdenes del propio miembro (`filter: { 'buyerInfo.memberId': { $eq: id } }`); fallo de Wix → estado fatal, nunca 500.
- `POST /api/account/profile` (form `firstName|lastName|phone|returnTo`) → 303 `/account/?saved=1`; teléfono inválido → `?error=invalid`; sesión muerta → `?error=profile`; origin ajeno → 403; sin sesión → 303 login.
- Órdenes: `searchOrders` (no existe `listOrders` en `@wix/ecom` 1.0.2648), sort por defecto DESC `_createdDate`, estados mapeados a `account.orders.status.*` (APPROVED/CANCELED/PENDING/REJECTED/INITIALIZED).

**i18n**: 32 claves nuevas (`account.*` 30 + `seo.account.*` 2, 390→422 en) → `translation push` OK → seed es/it REST (translation-content bulk 64/64) → `pull` roundtrip (es/it 420/422, 2 faltantes preexistentes de carta del step-10).

**Verificación**
- Smoke real (Node + signOn del miembro `auth-smoke@namicrestaurant.com` → redirect-session → cookie `wix-session`): `/account/`, `/es/account/`, `/it/account/` 200 con copy propio y h1 "Hello/Hola/Ciao, auth-smoke"; perfil del miembro visible; estado vacío de órdenes; header con botón Account + form logout.
- POST perfil real: update → 303 `?saved=1` y inputs con valores nuevos; teléfono malo → 303 `?error=invalid`; origin `evil.test` → 403; visit `/login/` logueado → 302 returnTo; logout → 303 al logout de Wix. Datos del miembro de prueba restaurados (firstName/lastName vacíos + `deleteMemberPhones`).
- E2E `src/tests/account.spec.ts`: 5 tests (redirect 3 locales al login con returnTo; sesión falsa no vencida → estado fatal traducido en 3 locales sin 500; POST sin sesión → 303 login y origin ajeno → 403; contrato POST teléfono malo → `error=invalid` y sesión muerta → `error=profile`; header de visitante con link login en /login/ y /es/login/). Suite completa: **24 passed + 1 skipped** (contract real opt-in de reserve).
- Typecheck focalizado (`tsc --noEmit --baseUrl .` con typescript 5.9.3 añadido exacto a devDependencies): sin errores en los archivos nuevos (el repo arrastra errores previos ajenos: astro.config, motion.ts, env.ts, public-client.ts).
- Puerto 4321 liberado al terminar.

**Pendiente / parket**
- Órdenes reales: el miembro de prueba no tiene compras; la validación "comprar gift card → orden aparece en la lista" se hará en step-15 (que ya lo contempla). El contrato `searchOrders` + filtro por memberId está verificado sintácticamente y el estado vacío es el camino probado hoy.
