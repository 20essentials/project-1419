# ROADMAP — Nami (project-1419)

Migración de Nami a **Wix Headless self-managed** + **Cloudflare Workers**.

- Referencia técnica: `20essentials/project-1415` (reusar sus recetas, no su integración `@wix/astro`).
  - `.opencode/skills/.../inline-recipes/setup-restaurant-reservations.md`
  - `.opencode/skills/.../inline-recipes/how-to-code-restaurant-reservations.md`
  - `.opencode/skills/.../inline-recipes/how-to-code-members-custom-login.md`
  - `.opencode/skills/.../inline-recipes/how-to-code-restaurant-orders.md`
- Docs clave:
  - https://dev.wix.com/docs/go-headless/self-managed-headless/about-self-managed-headless.md
  - https://dev.wix.com/docs/go-headless/authentication/members/identity-providers/sign-in-with-google-or-facebook-js-sdk.md
  - https://docs.astro.build/en/guides/integrations-guide/cloudflare/

## Decisiones cerradas

| Tema | Decisión |
|---|---|
| Modelo | Self-managed headless (SDK `@wix/sdk`, sin `@wix/astro`, sin hosting Wix) |
| Hosting | Astro 7 `output: 'server'` + `@astrojs/cloudflare` en Cloudflare Workers (se abandona gh-pages) |
| Auth visita/admin | `OAuthStrategy({ clientId })` público para visitante/miembro + `ApiKeyStrategy` server-side para operaciones admin (`createReservation`, menús) |
| Miembros | Login **custom** (email/contraseña y botones Google/Facebook con `getAuthUrl({ idp })`), tokens en cookies HttpOnly, `/account/` con orders (`@wix/ecom`) |
| i18n | Inglés default sin prefijo + `/es/` + `/it/` con slugs idénticos. Copy en `src/translations.json`; traducciones editables en el **Translation Manager** del dashboard Wix vía `wix translation push/pull` (CLI) |
| Contenido dinámico | Menú de `/carta/` y disponibilidad de `/reserve/` desde **Wix Restaurants** (`@wix/restaurants`, `@wix/table-reservations`) con API key SSR + caché |
| Pasos | `.opencode/commands/step-XX-*.md`, un paso por sesión/día, commit tras cada paso |

## Fases

- [ ] **Fase 0 — Cimientos de infraestructura**
  - [ ] [step-01-cloudflare-migration](.opencode/commands/step-01-cloudflare-migration.md)
  - [x] step-01 ejecutado y commiteado (`build(cloudflare)`)
  - [ ] [step-02-wix-env-and-client](.opencode/commands/step-02-wix-env-and-client.md)
  - [x] step-02 ejecutado y commiteado: smoke 200 con credenciales reales (locations OK); app Table Reservations instalada después vía Apps Installer API (appInstance c9d6a76e-ad6e-460a-9bab-d125ec7b90a8) y smoke 200 en ambos clientes (admin + public). Nota: `astro dev` falla con el adapter cloudflare (`./assets/image-asset` no exporta bajo workerd) — usar `pnpm build && pnpm preview` para probar endpooints en dev.
- [ ] **Fase 1 — i18n (el dashboard manda)**
  - [ ] [step-03-translations-extraction](.opencode/commands/step-03-translations-extraction.md)
  - [x] step-03 ejecutado y commiteado: `src/translations.json` verificado en inglés, `t()` en `src/i18n/t.ts`, `nami.ts` solo estructura, baseline español en `.opencode/references/spanish-copy-baseline.md`; pendiente step-04 rellenar es/it
  - [x] step-04 ejecutado y commiteado: `@wix/cli` 1.2.9 + `wix.config.json` (projectType Site, appId=WIX_CLIENT_ID dcb89266, siteId 51f83d7e). La CLI exige Node >= 24.22.1 (portable Node en /tmp/opencode/node24; `.nvmrc`). App Wix Multilingual instalada via Apps Installer API (appInstance 01e02c85-a8aa-4257-8c23-3c7b2cb4860d, appDefId 14d84998-ae09-1abf-c6fc-3f3cace5bf19); multilingual mode activado (locale-settings/v2), primario migrado it→en (auto-borra el primario viejo), locales es/it creados via locales/v2. `wix translation push` (189 claves, schemaId e2aa6aa7-52f4-46e9-8723-8608207d19b6, entityId=clave plana, `--json` evita el prompt Ink sin TTY). Seed: es desde `spanish-copy-baseline.md` (187 publicadas via translation-content/v1/bulk/contents/create), it auto-traducido via machine-translation/v3. `wix translation pull` ok tras publicar: `.wix/multilingual/{metadata,translations/{es,it}}.json` commiteados; `pnpm build` = `wix translation pull --json && astro build`; `getT()` consume los JSON con spread es/it + fallback en. Roundtrip probado: PATCH translation-content/v1/contents/by-key → pull → se refleja en el JSON. README documenta el flujo editor. Pendiente: deploy hook CI para pull automático (Riesgo #4).
  - [x] step-05 ejecutado y commiteado: config `i18n` en astro.config.mjs (en sin prefijo + fallback es/it a en con `fallbackType: 'rewrite'`), páginas planas con `Astro.currentLocale` (páginas es/it prerenderizadas por fallback); `src/i18n/routing.ts` (localeFromPathname/localizedPathname); switcher EN/ES/IT en header (sm+) y menú móvil; layout con `html lang`, canonical por locale, hreflang en/es/it + x-default, og:locale y alternates; sitemap con i18n → alternates de las 3 locales en sitemap-0.xml (serialize de imágenes intacto, solo en '/'); schema.org locale-aware e IDs localizados (`/es/#restaurant`); `links.reservar` → `/reserve/`; fix footer nav (`/${href}` rompía anchors en otras locales). Verificado con `pnpm build && pnpm preview` (puerto 4321 liberado).
- [ ] **Fase 2 — Reservas (`/reserve/`, Wix Restaurants)**
  - [ ] [step-06-restaurants-setup](.opencode/commands/step-06-restaurants-setup.md)
  - [x] step-06 ejecutado: location default actualizada a Nami (Passeig de Gràcia 24, 08008 Barcelona, Europe/Madrid, rev 2; PUT exige `default: true` echo); reservation-location default (mismo id f3291845) con rev 2: approval AUTOMATIC (ya venía), partySize 1–8, minimumReservationNotice 60 MIN, defaultTurnoverTime 90, timeSlotInterval 15, schedule LUN–DOM 13:00–23:00 (horario real publicado). Intento de `onlineReservationsEnabled: true` respondió 428 PREMIUM_ONLY (precondición owner: premium; la lectura sigue dando true). Smoke: locations OK, config OK, time-slots 200 con slots AVAILABLE. Detalles y gotchas: `.opencode/references/reservations-config.md`
  - [ ] [step-07-reserve-api](.opencode/commands/step-07-reserve-api.md)
  - [ ] [step-08-reserve-page](.opencode/commands/step-08-reserve-page.md)
  - [ ] [step-09-reserve-e2e](.opencode/commands/step-09-reserve-e2e.md)
- [ ] **Fase 3 — Carta y páginas de contenido**
  - [ ] [step-10-menu-from-restaurants](.opencode/commands/step-10-menu-from-restaurants.md)
  - [ ] [step-11-legal-static-pages](.opencode/commands/step-11-legal-static-pages.md)
- [ ] **Fase 4 — Miembros / Account (login custom)**
  - [ ] [step-12-auth-core](.opencode/commands/step-12-auth-core.md)
  - [ ] [step-13-custom-login-pages](.opencode/commands/step-13-custom-login-pages.md)
  - [ ] [step-14-account-orders](.opencode/commands/step-14-account-orders.md)
- [ ] **Fase 5 — Regalar / pagos**
  - [ ] [step-15-gift-cards-checkout](.opencode/commands/step-15-gift-cards-checkout.md)
- [ ] **Extras futuros** (no planificados aún)
  - [ ] Deploy hook / cron rebuild para `wix translation pull` tras ediciones en dashboard
  - [ ] [step-100-deploy](.opencode/commands/step-100-deploy.md) *(deferido: `wrangler login` + `wrangler deploy`, se ejecuta cuando se quiera publicar o cambiar de dominio)*
  - [ ] Redirect 301 `/reservar/` → `/reserve/` (slugs idénticos; el link histórico era español)
  - [ ] Dominio `namicrestaurant.com` (registrar el dominio y añadirlo como custom domain en Cloudflare: ver step-100, paso 4)

## Convenciones obligatorias (de AGENTS.md, aplicarlas en cada paso)

- Gestor: **pnpm**; dependencias **exactas** (sin caret `^`).
- Todo asset llamado desde TS/JSX de Astro: `baseUrl(...)`. CSS no (`url(/assets/logo.svg)`). El CSS no necesita baseUrl para background-image.
- Archivos en `src/` en kebab-case (sin CamelCase, `_` ni espacios). Tests en `src/tests/`.
- Prohibido `export default`, salvo API routes y `.astro` (usar `export const`).
- Sin comentarios en el código.
- Al probar (`astro dev`, Playwright, `wrangler dev`), cerrar siempre el servidor y liberar el puerto 4321 (`taskkill` del PID LISTENING) antes de terminar.
- Sin `hreflang`/SEO inconsistente: cada página actualiza canonical canonical + hreflang de su locale.

## Riesgos y notas

1. **Premium**: activar `onlineReservationsEnabled` (reservas online) y el checkout de gift cards requieren sitio Wix premium; en trial se espera `428 PREMIUM_ONLY` (no fatal). Importante: las fases 0/1/3/4 no dependen del premium; la Fase 2/5 degradan con mensajes claros mientras no se pague.
2. **Scopes de API key**: la API key debe tener permisos "Manage restaurant reservations" (+ lectura de menús); si algún endpoint rechaza API key → usar OAuth client_credentials como fallback backend.
3. **Fragment en social login**: Google/Facebook devuelven `code`/`state` en el fragment (`#...`), invisible para el servidor → el callback es página client-side + `POST` a `/api/auth/session` para cookies HttpOnly. Requiere **allow-list de redirect URIs** en Headless Settings (precondición de step-02).
4. **Traducciones → deploy**: editar en dashboard obliga `wix translation pull` + rebuild. Mitigación futura: deploy hook.
5. **Trial de `wrangler dev` y `@wix/sdk`**: `@wix/sdk` usa fetch estándar, compatible con Workers; verificar en step-02 con una llamada de humo (lista de ubicaciones de localización).
