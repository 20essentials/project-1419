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
