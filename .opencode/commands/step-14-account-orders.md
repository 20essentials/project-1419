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
