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

## Resultado

✅ Ejecutado (2026-11-09). Wizard vanilla JS, sin framework ni paquetes nuevos.

**Live**

- `src/pages/reserve/index.astro` (thin, prerender, una página para en/es/it gracias al fallback rewrite de step-05).
- `src/features/reserve/wizard.astro`: markup + payload JSON (todo el copy `t()`) en `data-wizard-data`.
- `src/features/reserve/wizard-client.ts`: estados boot/premium/fatal/wizard/done; paso 1 pills `aria-pressed`; paso 2 calendario mensual (`Intl` months + weekdays desde `schedule`, hoy→+60d); paso 3 slots con skeleton + retry; paso 4 form con validación por campo y `aria-live`; errores mapeados del contrato expuesto en `wizard.astro`; done distingue `RESERVED`/`REQUESTED`.
- `src/features/reserve/reserve-schema.ts`: JSON-LD (Restaurant `@id …#restaurant` con `acceptsReservations: true` + ReserveAction/EntryPoint/hreflang, WebPage sobre la página).
- `src/shared/ui/icon.astro`: icono `arrowRight`.

**Copy/i18n (53+2 claves nuevas)**

- `reserve.*` (53) + `seo.reserve.title/description` en `src/translations.json` (242 total).
- Gotcha: `wix translation push` crea claves EN **sin auto-traducir**, y `pull` solo devuelve las claves con contenido es/it **creado** → seed es + it (manual, desde script) vía REST `translation-content/v1/bulk/contents/create` (header `Authorization: WIX_API_KEY` + `wix-site-id`; schemaId `e2aa6aa7-52f4-46e9-8723-8608207d19b6`), luego `pnpm translations:pull`. Chunks de ~25 keys.
- Fix colateral: PATCH `/contents/by-key` pide body `{ content: { schemaId, entityId, locale, fields } }` (el 400 "content must not be empty" era body sin wrapper). Usado para `footer.rights` it (la MT del dashboard había cambiado `{year}` → `{anno}`; `t()` dejaba el placeholder sin sustituir).

**Fixes colaterales**

- `src/app/header.astro` tenía `href` **duplicado** en los nav links (quedó el original + el de `anchor()` de step-05); eliminado el primero.
- HTML final verificado: un solo `href="/{locale}/#anchor"` por link, `© {year} …` renderiza el año en las 3 locales.

**Smoke (`pnpm build && pnpm preview`, puerto 4321, cerrado al terminar)**

- `/reserve/`, `/es/reserve/`, `/it/reserve/` → 200; title/description/copy correctos por locale; canonical + hreflang + x-default OK; JSON-LD OK.
- `GET /api/reserve/setup` 200 (experiencias: `[]` — trial del dashboard sin tablas/experiencias configuradas; el wizard degrada a tabla por defecto).
- `GET /api/reserve/slots?date=…&partySize=2` sin `experienceId` → 200 (96 slots con `timeSlots`); POST smoke de errores coherente (experienceId desconocido → 404, campo `slot` en vez de `time` → 400 INVALID_INPUT).
- Reserva E2E completa diferida a step-09 (Playwright) — el step-07 ya validó POST → 200 RESERVED con estos mismos endpoints.

Siguiente: `step-09-reserve-e2e`.
