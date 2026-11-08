---
name: "Step 08 — Página /reserve/"
goal: "Wizard multi-paso de reservas (/reserve/ en en, /es/reserve/, /it/reserve/) que consume la API del step-07, con copy 100% t()."
---

# Step 08 — Página /reserve/

## Precondiciones

- Step-07 (3 rutas api) y step-05 (locales) listos.
- Contrato JSON en `.opencode/references/reserve-api-contract.md`.

## Objetivo

Página de reservas de Nami con el estilo del sitio (píldora del header, tipografía Hina Mincho / Zen Kaku Gothic New): personas → fecha → hora → datos → confirmación.

## Pasos

1. **Estructura**
   - `src/pages/reserve/index.astro` (una sola página por idioma gracias a step-05; array de datos server-side con fetch a `/api/reserve/setup` para prerender-friendly fallback si enabled).
   - Estado del wizard con **vanilla JS ligero** (estilo del repo, Lenis ya está); si la complejidad pide una isla React/Preact, decidir con criterio e instalar versión exacta. Por defecto: solo fetch + render.
2. **Wizard**
   - Paso 1: partySize (selector desde config min/max).
   - Paso 2: calendario/navegación de fechas (mes corriente +60 días, notice), solo días con schedule.
   - Paso 3: grid de slots del día (fetch `/api/reserve/slots`).
   - Paso 4: form (`firstName, lastName, email, phone, note`) con validación HTML + errores accesibles (aria-live).
   - Confirmación: estado success con detalles de la reservation (status devuelto).
   - Errores traducidos via t(): `reserve.errors.noAvailability`, `reserve.errors.notPremium`, `reserve.errors.generic` (409/428/400 mapping del step-07).
3. **Copy y diseño**
   - Todo el texto vía `t('reserve.*')` + claves nuevas en `translations.json` push/pull en el build.
   - Style guide: píldoras, focus ring, micro copy botón CTA (post del landing-page-design skill existente).
   - Los assets (imágenes/es) via `baseUrl(...)` si hace falta.
4. **Meta per página**
   - Title/description por locale (`seo.reserve.*`), JSON-LD `Restaurant + acceptsReservations` donde toque (SEO título en el step-14 de project-1415 opcionaledicional).
5. **E-commerce/E2E prep**
   - Resets pf: botón volver/mas steps; autofill minor enterprise cookie clearing.

## Criterios de aceptación

- Flujo completo manual en `wrangler dev`: puedo reservar hasta success (o 428 claro si el owner no ha pagado premium).
- `/es/reserve/` e `/it/reserve/` renderizan la página con su copy.
- Título/description/hreflang correctos en el build.
- Sin comentarios; componentes kebab-case.

## Notas

- Si el owner no ha activado online reservations (trial), mostrar pantalla explicativa (plan B mostrada en step-07) — dejamos la posible compra de premium fuera de este step.
- Liberar 4321/8787 al cerrar sesión de pruebas.
