# ROADMAP — Nami (project-1419)

Fuente de verdad del **QUÉ** sigue. Los comandos `.opencode/commands/step-N-*.md` son
la fuente de verdad del **CÓMO** ejecutar cada paso. Los hallazgos y verificaciones
de cada paso quedan en la sección `## Resultado` del step file (las filas de aquí
solo referencian: nota en una línea).

Modelo: **Wix Headless self-managed** (SDK `@wix/sdk`, sin `@wix/astro`) + **Cloudflare Workers**.

## Resumen rápido

| Estado | Cuenta |
|:--|:--|
| ✅ done | 10 |
| ⏳ pendiente | 5 |
| 🅿️ deferido (parket) | 1 |
| **Total pasos** | **16** |

**Siguiente:** `step-10-menu-from-restaurants` (Fase 3 — Carta y contenido)

| Paso | Estado | Paso | Notas |
|:--|:--|:--|:--|
| 01 · Cloudflare migration | ✅ done | `step-01-cloudflare-migration.md` | `@astrojs/cloudflare` + `output: 'server'` |
| 02 · Wix env + clientes | ✅ done | `step-02-wix-env-and-client.md` | smoke 200; app Table Reservations instalada → `references/reservations-config.md` |
| 03 · Extracción de copy | ✅ done | `step-03-translations-extraction.md` | `translations.json` + `t()`; `nami.ts` solo estructura |
| 04 · Multilingual flow | ✅ done | `step-04-multilingual-flow.md` | 189 claves push/pull; seed es + it auto-traducido; roundtrip verificado |
| 05 · Routing de idioma + SEO | ✅ done | `step-05-language-routing.md` | `/es/` `/it/` con fallback rewrite; hreflang; switcher; sitemap i18n |
| 06 · Restaurants setup | ✅ done | `step-06-restaurants-setup.md` | location + reservation config (LUN–DOM 13:00–23:00); 428 premium esperado |
| 07 · Reserve API | ✅ done | `step-07-reserve-api.md` | `/api/reserve/*` (setup/slots/POST) verificados con humo real; contrato en `reserve-api-contract.md` |
| 08 · Reserve page | ✅ done | `step-08-reserve-page.md` | wizard `/reserve/` (en/es/it) con copy t(); 53 claves + seed es/it vía translation-content REST |
| 09 · Reserve E2E | ✅ done | `step-09-reserve-e2e.md` | Playwright mock: wizard success/409/428/móvil (10 verdes) + contract real opt-in |
| 10 · Carta desde restaurants | ⏳ pending | `step-10-menu-from-restaurants.md` | `@wix/restaurants` → `/carta/` |
| 11 · Legal estáticas | ⏳ pending | `step-11-legal-static-pages.md` | `/legal/` `/privacidad/` `/cookies/` `/terminos-compra/` |
| 12 · Auth core | ⏳ pending | `step-12-auth-core.md` | OAuth visitante/miembro + sessions en cookies |
| 13 · Custom login pages | ⏳ pending | `step-13-custom-login-pages.md` | email/pass + Google/Facebook |
| 14 · Account + orders | ⏳ pending | `step-14-account-orders.md` | `/account/` con órdenes `@wix/ecom` |
| 15 · Gift cards | ⏳ pending | `step-15-gift-cards-checkout.md` | checkout gift cards (premium requerido) |
| 100 · Deploy | 🅿️ parket | `step-100-deploy.md` | `wrangler deploy` al querer publicar |

## Fases

- **Fase 0 — Cimientos de infraestructura**: step-01, step-02 → ✅ 2/2
- **Fase 1 — i18n (el dashboard manda)**: step-03, step-04, step-05 → ✅ 3/3
- **Fase 2 — Reservas (`/reserve/`, Wix Restaurants)**: step-06, step-07, step-08, step-09 → ✅ 4/4
- **Fase 3 — Carta y páginas de contenido**: step-10, step-11 → ⏳ 0/2
- **Fase 4 — Miembros / Account (login custom)**: step-12, step-13, step-14 → ⏳ 0/3
- **Fase 5 — Regalar / pagos**: step-15 → ⏳ 0/1
- **Extras futuros** (parket, no ejecutar por iniciativa propia):
  - 🅿️ Deploy hook/cron rebuild para `wix translation pull` tras ediciones en dashboard (Riesgo 4)
  - 🅿️ Redirect 301 `/reservar/` → `/reserve/` (el link histórico era español)
  - 🅿️ Dominio `namicrestaurant.com` (registrar + custom domain en Cloudflare, ver step-100)

Estados: `pending` (existe su step file, sin ejecutar) → `✅ done` (ejecutado y verificado).
`parket` solo se ejecuta cuando el propietario lo pida explícitamente.

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Modelo | Self-managed headless (SDK `@wix/sdk`, sin `@wix/astro`, sin hosting Wix) |
| Hosting | Astro 7 `output: 'server'` + `@astrojs/cloudflare` en Cloudflare Workers |
| Auth visita/admin | `OAuthStrategy({ clientId })` público para visitante/miembro + `ApiKeyStrategy` server-side para operaciones admin (`createReservation`, menús) |
| Miembros | Login **custom** (email/contraseña y botones Google/Facebook con `getAuthUrl({ idp })`), tokens en cookies HttpOnly, `/account/` con orders (`@wix/ecom`) |
| i18n | Inglés default sin prefijo + `/es/` + `/it/` con slugs idénticos. Copy en `src/translations.json`; ediciones en dashboard Wix vía `wix translation push/pull` (CLI) |
| Contenido dinámico | Menú de `/carta/` y disponibilidad de `/reserve/` desde **Wix Restaurants** (`@wix/restaurants`, `@wix/table-reservations`) con API key SSR + caché |
| Arquitectura | Screaming Architecture moderna en `src/` (`app/`, `features/`, `shared/`, `pages/` thin) con alias `@/` y **sin barrels** (imports directos por archivo). Reglas en `AGENTS.md` |
| Pasos | `.opencode/commands/step-XX-*.md`, un paso por sesión/día, commit tras cada paso |

## Convenciones obligatorias (de AGENTS.md, aplicarlas en cada paso)

- Gestor: **pnpm**; dependencias **exactas** (sin caret `^`).
- Todo asset llamado desde TS/JSX de Astro: `baseUrl(...)`. El CSS no lo necesita (`url(/assets/logo.svg)`).
- Archivos en `src/` en kebab-case (sin CamelCase, `_` ni espacios). Tests en `src/tests/`.
- Prohibido `export default`, salvo API routes y `.astro` (usar `export const`).
- Sin comentarios en el código.
- Al probar (`astro dev`, Playwright, `wrangler dev`), cerrar siempre el servidor y liberar el puerto 4321 (`taskkill` del PID LISTENING) antes de terminar.
- Sin `hreflang`/SEO inconsistente: cada página actualiza canonical + hreflang de su locale.

## Riesgos y notas

1. **Premium**: activar `onlineReservationsEnabled` (reservas online) y el checkout de gift cards requieren sitio Wix premium; en trial se espera `428 PREMIUM_ONLY` (no fatal). Importante: las fases 0/1/3/4 no dependen del premium; la Fase 2/5 degradan con mensajes claros mientras no se pague.
2. **Scopes de API key**: la API key debe tener permisos "Manage restaurant reservations" (+ lectura de menús); si algún endpoint rechaza API key → usar OAuth client_credentials como fallback backend.
3. **Fragment en social login**: Google/Facebook devuelven `code`/`state` en el fragment (`#...`), invisible para el servidor → el callback es página client-side + `POST` a `/api/auth/session` para cookies HttpOnly. Requiere **allow-list de redirect URIs** en Headless Settings (precondición de step-02).
4. **Traducciones → deploy**: editar en dashboard obliga `wix translation pull` + rebuild. Mitigación futura: deploy hook.
5. **Trial de `wrangler dev` y `@wix/sdk`**: `@wix/sdk` usa fetch estándar, compatible con Workers; verificado en step-02 con smoke 200 (locations).

## Detalle de ejecución (histórico de los steps ✅)

- **step-02**: smoke 200 con credenciales reales (locations OK); app Table Reservations instalada vía Apps Installer API (appInstance `c9d6a76e-ad6e-460a-9bab-d125ec7b90a8`) y smoke 200 en ambos clientes (admin + public). Nota: `astro dev` falla con el adapter cloudflare (`./assets/image-asset` no exporta bajo workerd) — usar `pnpm build && pnpm preview` para probar endpoints en dev.
- **step-04**: `wix.config.json` (projectType Site, appId=WIX_CLIENT_ID dcb89266, siteId 51f83d7e). La CLI exige Node >= 24.22.1 (portable Node en /tmp/opencode/node24; `.nvmrc`). App Wix Multilingual instalada vía Apps Installer API (appInstance 01e02c85-…, appDefId 14d84998-…) — locale-settings/v2; primario migrado it→en, locales es/it creados. `wix translation push` (189 claves, schemaId e2aa6aa7-…) sin TTY requiere `--json`. Seed: es desde `spanish-copy-baseline.md` (187 publicadas), it auto-traducido. `pnpm build` = `wix translation pull --json && astro build`; `getT()` consume `.wix/multilingual/*.json` con spread es + fallback en. Roundtrip probado (PATCH → pull → JSON).
- **step-05**: páginas planas con `Astro.currentLocale` (páginas es/it prerenderizadas por fallback tipo `rewrite`); `shared/i18n/routing.ts`; switcher EN/ES/IT en header (sm+) y menú móvil; `html lang`, canonical por locale, hreflang + x-default, og:locale y alternates; sitemap i18n con alternates de las 3 locales; schema.org locale-aware e IDs localizados (`/es/#restaurant`); `links.reservar` → `/reserve/`; fix footer nav para anchors en otras locales.
- **step-06**: location default → Nami (Passeig de Gràcia 24, 08008 Barcelona, Europe/Madrid, rev 2); reservation-location default (mismo id f3291845) con rev 2: approval AUTOMATIC, partySize 1–8, minimumReservationNotice 60 MIN, defaultTurnoverTime 90, timeSlotInterval 15, schedule LUN–DOM 13:00–23:00. `onlineReservationsEnabled: true` respondió 428 PREMIUM_ONLY (la lectura da true). Smoke: time-slots 200 con slots AVAILABLE. Gotchas → `references/reservations-config.md`.
- **step-07**: `src/features/reserve/` (site-time TZ Madrid con doble pasada DST; reservation-context lee `configuration.onlineReservations.*` — anidado en el SDK real, no aplanado; slots con `timeSlots.getTimeSlots(id, new Date(date+'T12:00:00Z'), partySize, { slotsBefore: 50, slotsAfter: 50 })` — args posicionales, ancla es una hora, máx 50/lado; error map: 400/404/409/428/502, nunca 500; API key server-side + `console.info` con email maskado). Rutas: `pages/api/reserve.ts` (POST) + `api/reserve/setup.ts` (cache 600s) + `api/reserve/slots.ts` (no-store). Smoke real: setup 200 con config de step-06; slots 96 slots (41 libres 13:00–23:00); POST → 200 `RESERVED` (trial abre create, premium-gate solo cambiará a 428 si Wix lo impone); 10:00 → 409; email mal → 400; experienceId desconocido → 404. Contrato JSON → `references/reserve-api-contract.md` (fuente para step-08/09). `@wix/table-reservations` timeSlots añadido al admin-client.
- **step-08**: wizard vanilla JS en `src/features/reserve/` (`wizard.astro` + `wizard-client.ts`): tarjeta glass, pills `aria-pressed`, estados boot/premium/fatal/wizard/done, 4 pasos (personas → calendario mensual con solo días de schedule, hoy→+60d → slots con skeleton+retry → form validado por campo), done con status RESERVED/REQUESTED; JSON-LD ReserveAction en `reserve-schema.ts`; ruta única `pages/reserve/index.astro` prerenderizada para en/es/it. 53 claves `reserve.*` + `seo.reserve.*`: `translation push` NO auto-traduce (crea en sin published) y `pull` solo devuelve claves con contenido creado → seed es/it vía REST `translation-content/v1/bulk/contents/create` (+ PATCH `/contents/by-key` con body `{content:{…}}` para fixes). Fix colateral: anchors duplicados `href` en `header.astro` (quedaba `href` original + `#{item.href}`) y MT del dashboard había roto `{year}` → `{anno}` en `footer.rights` it. Smoke: las 3 locales 200 con copy propio, setup 200; POST E2E no repetido aquí (dashboard trial sin experiences configuradas → `experiences: []`; step-09 lo cubrirá con Playwright).
- **step-09**: E2E Playwright (`@playwright/test 1.65.0` exacto; `playwright.config.ts` con webServer `astro build && astro preview` en 4321, teardown `pnpm test:e2e` → `src/tests/free-port-4321.cjs`; `test-results/` en .gitignore). Fixtures `src/tests/fixtures/reserve-*.json` **con envoltura `{slots:[...]}`** (contrato) y setup; `src/tests/reserve-flow.spec.ts`: 10 mocks verdes (success con body del POST verificado, REQUESTED, validación por campo, 428 sin perder form, 409 post→vuelta a slots, slots 409 con retry, slots vacíos→back borra, setup rojo→fatal, calendario ventana/meses, móvil 390×844) + contract real opt-in de setup con `RESERVE_E2E_REAL=1` (verificado 1/1). **El E2E destapó 5 bugs del step-08 que el smoke HTML no ve (el wizard JS nunca se había corrido en un browser)**: `addEventListener` sobre null (panel 4 sin `[data-next]`), `classList.toggle/add` con tokens multi-clase (`DOMTokenList` lanza → helper `setPillVariant`), `state.step` inexistente en back-navigation, id de error `reserve-firstName-error` vs markup `reserve-first-name-error`, y `showDone` pegando `T12:00:00Z` a un `localStart` ya datetime (`Invalid Date`). Lección OP: tras escribir JS de cliente, correr Playwright contra build real antes de cerrar el step.
