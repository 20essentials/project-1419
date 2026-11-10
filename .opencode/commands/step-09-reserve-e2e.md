---
name: "Step 09 — E2E de reservas"
goal: "Tests Playwright del flujo /reserve/ contra wrangler dev con mock de Wix (sin depender de la cuenta real), más guardas de dev."
---

# Step 09 — E2E de reservas

## Precondiciones

- Step-08 (página completa) y step-07 (api).

## Objetivo

Cobertura automatizada del flujo de reserva: paths de success, NO_AVAILABILITY y PREMIUM_ONLY, sin tocar Wix real en CI.

## Pasos

1. **Infra de tests**
   - Playwright si ya está en el repo, o instalar exacto `pnpm add -DE -E @playwright/test`.
   - Tests en `src/tests/` (AGENTS.md): `src/tests/reserve-flow.spec.ts` (nombre librería del pattern actual del repo si existe ya).
   - Mock de las respuestas de `/api/reserve/*`: route de Playwright intercepta y devuelve JSONs fijos (fixtures `src/tests/fixtures/reserve-*.json`).
2. **Casos**
   - Ventana 1: wizard completo → success con datos de reserva visibles.
   - Ventana 2: slots vacíos (429/409 sim) → mensaje `noAvailability` visible + opción volver.
   - Ventana 3: 428 premium → mensaje claro, sin datos perdidos del form.
   - Smoke responsive: mobile layout del wizard (Playwright viewport).
3. **Contract para front**
   - Test que valida el contracto del `/api/reserve/setup` cuando corre sin mock (solo local: `wrangler dev` + `WIX_API_KEY` presente): salta si env no está.
4. **Guardas de cierre**
   - Script de teardown de tests: tras hacerlo, check del puerto 4321 y 8787 en teardown (LISTENING → taskkill PID) — automatizar con hook o manual en AGENTS.md.
5. **Docs**
   - Actualizar ROADMAP checklist (Fase 2 ✅ si todo pasa).

## Criterios de aceptación

- `pnpm exec playwright test src/tests/reserve-flow.spec.ts` verde (mock).
- No hay ninguna reserva creada en la cuenta Wix real al correr tests.
- CI-able: los mocked corren sin secretos (el smoke real solo local y opt-in).

## Notas

- Recuerda AGENTS.md: al terminar, cerrar servidores (astro dev/wrangler dev) y liberar 4321.

## Resultado

✅ Ejecutado (2026-11-10). 10 tests mock verdes + 1 contract real opt-in.

**Infra**

- `@playwright/test 1.65.0` (dev, exacto) + chromium instalado. `playwright.config.ts` (raíz): `testDir './src/tests'`, baseURL `http://localhost:4321`, webServer `pnpm exec astro build && pnpm exec astro preview --port 4321` (el build es `astro build` directo, sin `pull` de traducciones → CI-able sin secretos), `reuseExistingServer: false`, workers 1.
- Script `pnpm test:e2e` = `playwright test && node src/tests/free-port-4321.cjs` (mata LISTENING en 4321/8787 al salir). `test-results/` + `playwright-report/` en `.gitignore`.

**Tests (`src/tests/reserve-flow.spec.ts`)**

- Fixtures: `reserve-setup-mock.json` (window 60d, schedule 7 días, experiences []) y `reserve-slots-*.json` — **siempre con la envoltura `{slots:[...]}` del contrato**, no arrays sueltos.
- Casos mock: success completo (intercepta el POST y verifica su body: date/time/partySize/email/note), REQUESTED, validación por campo (tooltips + `#reserve-first-name-error` + focus, panel sigue intacto), 428 → pantalla premium con el form sin perder valores, 409 tras POST → vuelve a paso 3 y recarga slots, slots 409 → `NO_AVAILABILITY` + retry visible, todos indisponibles → `slotsEmpty` y back limpia selección, setup 502 → estado fatal, calendario (días pasados disabled, navegación de mes), flujo completo móvil en 390×844.
- Copy asertado a través del payload `[data-wizard-data]` (JSON.parse en DOM): robusto frente a cambio de locale.
- Contract real: `test.skip(process.env.RESERVE_E2E_REAL !== '1')`; verificado 1/1 localmente (setup 200 sin mock, timeZone Europe/Madrid).
- `pnpm exec playwright test src/tests/reserve-flow.spec.ts` → 10 passed. Los tests no crean reservas en Wix real.

**Bugs del step-08 que el E2E destapó (y fixes, todos en `src/features/reserve/wizard-client.ts`)**

1. Boot roto en browser real: `nextButtons`/`prevButtons` guardaban `null` (panel 4 no tiene `[data-next]`) y `forEach → addEventListener` lanzaba → el wizard nunca salía de "boot". Fix: setear en el map solo si el elemento existe.
2. `classList.toggle(...multi-token...)` / `classList.add('bg-teja text-bg ring-teja')` → `DOMTokenList` lanza `InvalidCharacterError`. Fix: helper `setPillVariant(element, PILL_ON|PILL_OFF|PILL_DIM)` con `remove(...split(' '))` + `add(...split(' '))`; `paintTime` no pinta variantes de slots disabled.
3. Back-navigation consultaba `state.step` (inexistente) → el reset de fecha/hora nunca corría. Fix: reset directo por `target`.
4. `fieldError` generaba ids `reserve-firstName-error` pero el markup usa `reserve-first-name-error` (kebab) → los avisos por campo quedaban vacíos. Fix: camelCase → kebab al resolver el id.
5. `showDone` asumía `localStart` bare-date y le concatenaba `T12:00:00Z`; la API devuelve datetime completo (`YYYY-MM-DDTHH:mm:00`) → `Invalid Date` + `RangeError: Invalid time value` → error genérico en el form. Fix: `localDate = localStart.slice(0,10)`, `localTime = slice(11,16)`.

**Lección operativa** (ojo para steps futuros): el smoke del step-08 verificó HTML prerenderizado pero nunca ejecutó el JS del wizard en un browser; los 5 bugs pasaron el build. Ahora, cualquier step con JS de cliente cierra solo corriendo el E2E (`pnpm exec playwright test`).

Siguiente: `step-10-menu-from-restaurants`.
