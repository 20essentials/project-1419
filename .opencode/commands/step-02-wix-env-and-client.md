---
name: "Step 02 — Cuenta Wix, env, clientes SDK"
goal: "Headless client de Wix, API key admin, secretos, y dos clientes SDK: ApiKeyStrategy server-side y OAuthStrategy público."
---

# Step 02 — Cuenta Wix, env y clientes SDK

## Precondiciones

- Step-01 hecho (Workers corriendo en local).

## Objetivo

Proyecto Wix Headless self-managed operativo: cliente OAuth con client ID, credenciales admin, y `src/wix/` con dos clientes listos para usar.

## Pasos

1. **Proyecto Wix**
   - Crear account + **headless project** nuevo en Wix (o, si se parte de un sitio existente, "Set up a headless client"): https://dev.wix.com/docs/go-headless/self-managed-headless/get-started/create-a-self-managed-headless-project.md
   - Anotar `siteId` y el `clientId` del headless client (Headless Settings).
2. **Credenciales**
   - Registrar y publicar el sitio Wix (requerido para que funcionen los login redirects del SDK).
   - **Allow-list de redirect URIs y dominio** (precondición para Fase 4 y social): `https://locahost:4321/api/auth/callback` (corregir a `http://localhost:4321/...`), `/auth/callback`, y equivalentes de prod (workers.dev y futuro namicrestaurant.com). Doc: https://dev.wix.com/docs/go-headless/authentication/setup/allow-redirect-uris-and-domains.md
   - Crear **API key** con scopes mínimos para Fase 2/3: lectura de `table-reservations` (locations/experiences), `restaurants` (menús) y creación de reservations. Guardarla fuera del repo (password manager / Wix dashboard); en el código va como env server-only.
3. **Secretos**
   - `.dev.vars` local y `wrangler secret put` para prod. **Nunca** commitear valores.
   - `.env.example` con variables vacías: `WIX_CLIENT_ID`, `WIX_API_KEY`, `WIX_API_KEY_ID`, `WIX_SITE_ID` (patrón del repo project-1415).
4. **Instalar SDK Wix (versiones exactas)**
   - `pnpm add -E @wix/sdk @wix/table-reservations @wix/restaurants @wix/members @wix/ecom @wix/redirects`
   - Sin `@wix/astro` y sin `@wix/essentials` (solo funcionan con el hosting/integración de Wix).
5. **Clientes en `src/wix/` (kebab-case, `export const`)**
   - `src/wix/admin-client.ts`: factory con `ApiKeyStrategy({...env})` que recibe env.gc los módulos que usa: table-reservations, restaurants, locations si hace falta.
   - `src/wix/public-client.ts`: factory servidor con `OAuthStrategy({ clientId })` (sin tokens; para páginas visitante SSR). Token de sesión del miembro se inyecta en Fase 4.
   - Regla: la API key nunca sale del server (islands más adelante solo hablan con `/api/*`).

## Criterios de aceptación

- Smoke test (ruta temporal `/api/dev/wix-smoke` marcada para borrarse o script TS): con admin-client, `reservationLocations.listReservationLocations()` responde 200 con 1 location default (o array vacío) → credenciales válidas.
- Con public-client (sin API key), la misma llamada falla por permisos → confirma el split de identidades.
- `.env.example` committeado, secretos fuera de git.

## Notas

- Si algún endpoint del smoke rechaza API key por scope, anotarlo en el ROADMAP (Riesgo #2) antes de continuar a Fase 2.
