---
name: "Step 07 — API de reservas"
goal: "Rutas SSR /api/reserve/* con ApiKeyStrategy: setup (location+experiences), slots (proyección de agenda) y createReservation con errores mapeados."
---

# Step 07 — API de reservas

## Precondiciones

- Step-06 (reservation location y schedule configurados).
- Receta project-1415: `how-to-code-restaurant-reservations.md` + su `src/features/dining/reservations.ts` de referencia (proyección de slots: projectOccurrences()).
- SDK `@wix/table-reservations` instalado (step-02).

## Objetivo

API server para que la página `/reserve/` no hable nunca directo con Wix (la API key nunca sale del server).

## Pasos

1. **`GET /api/reserve/setup`** (autoriza: admin ApiKey)
   - `reservationLocations.listReservationLocations` → location default + su timezone y config (partySize min/max, notice, schedule).
   - `experiences.queryExperiences` → experiencias activas de la location (si hay "experiencias de cena" de Nami); devolver título traducible por clave (`reserve.experience.*` en translations.json) o identificador + datos no textuales.
   - Cache: Cloudflare `runtime.cache` o header `Cache-Control` corto (p. ej. 10 min) — config cambia poco.
2. **`GET /api/reserve/slots?date=YYYY-MM-DD&partySize=n&experienceId=...`**
   - Calcular del businessSchedule los slots del día (interval 15 min, notice mínimo, cierre un día/del mes +60 días max).
   - Proyección de ocurrencias tipo `projectOccurrences()` de project-1415 (el SDK no expone slots por experience vía getScheduledTimeSlots).
   - Respuesta: array de `{ time, available: true }` respetando notice y cierre del restaurante.
3. **`POST /api/reserve`**
   - Body: `{ date, time, partySize, experienceId?, firstName, lastName, email, phone, note? }`.
   - Validar rangos, email/phone format, TZ Europe/Madrid, notice.
   - Llamar `reservations.createReservation({ details: { reservationLocationId, experienceId?, startDate, partySize }, reservee: { ... } })`.
   - Mapear errores de Wix → HTTP: `NO_AVAILABILITY` → 409 (mensaje traducido en front), `PREMIUM_ONLY` → 428 { code: 'PREMIUM_ONLY', message traducido "reservas online aún no activas" }, validación → 400. Nunca 500 en errores de negocio.
   - Sin comentarios; export `const POST` (API routes sí, no `export default`).
4. **Observabilidad mínima**
   - `console.info` de events de negocio (sin PII completa: email maskado) para depurar en `wrangler dev`.

## Criterios de aceptación

- Los 3 endpoints responden correctamente en `pnpm wrangler dev` contra el proyecto Wix real.
- POST viene un salto (email test) y devuelve confirmación (status de la reservation devuelta por createReservation); NO_AVAILABILITY salta 409 con código.
- La API key no aparece en ninguna respuesta ni en el client (revisar headers de respuesta en dev).
- Sin comentarios; archivos kebab-case.

## Notas

- Guardar el contracto JSON de las 3 rutas en `.opencode/references/reserve-api-contract.md` para step-08 y tests.
- En trial sin premium, el POST puede 428: la UI de step-08 debe pintar bien ese caso.
