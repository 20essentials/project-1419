---
name: "Step 06 — Setup Wix Restaurants (Table Reservations)"
goal: "App Table Reservations instalada y configurada en el proyecto Wix: location real Barcelona, approval AUTOMATIC, horario/party sizes, online reservations intento ON."
---

# Step 06 — Setup Wix Restaurants (Table Reservations)

## Precondiciones

- Step-02 (API key admin con scopes de table-reservations).
- Receta de referencia project-1415: `setup-restaurant-reservations.md`.

## Objetivo

El backend de reservas queda listo para consumirse desde `/reserve/`: location default verificada y configurada para Nami.

## Pasos

1. **Dirección del negocio (Locations API)**
   - `GET /locations/v1/locations` → tomar la `default: true`.
   - `PUT /locations/v1/locations/{id}` (update FULL, requiere `revision`): dirección real provisional de Nami (Barcelona), `timeZone: 'Europe/Madrid'`, `default: true` echo. Ejemplo completo en la receta (STEP 0).
2. **Reservation location default**
   - `GET table-reservations/reservation-locations/v1/reservation-locations` → la entry `default: true` (auto-provisionada por el install del app). NO crear locations nuevas.
   - Guardar `id` + `revision`.
3. **Config de Nami (PATCH parcial, revision obligatoria)**
   - `partySize` min 1 / max 8 (a definir con el owner), `minimumReservationNotice` (p. ej. 60 min), `defaultTurnoverTime` (p. ej. 90), `businessSchedule` semanal propuesto (p. ej. MAR–SÁB 19:00–23:00, ajustar con horarios reales), `timeSlotInterval: 15`.
   - verificar `approval.mode: 'AUTOMATIC'` (sin operador del dashboard aprobando; es requerido headless). PATCH nuevo solo si está manual.
4. **Activar online reservations**
   - PATCH `onlineReservationsEnabled: true`.
   - Si responde `428 PREMIUM_ONLY` (esperado en proyectos free): registrar como precondición del owner (upgrade premium) y no fallar el resto del step.
5. **Contrato con el código**
   - Documentar en `.opencode/references/reservations-config.md` (kebab-case): reservationLocationId, approval mode, party sizes, horario, TZ, y el estado premium.
   - NADA hardcodeado en el código de `/api/reserve` (todo lectura dinámica desde la API en step-07).

## Criterios de aceptación

- Smoke con admin-client: puedo listar locations, leer la config y (si premium) quedó `onlineReservationsEnabled: true`.
- La config de schedule/party size coincide con lo pactado.
- Rec华东 lugar/x? ninguno: no POSTs de locations; únicamente update de config y address.

## Notas

- Las reservations reales las crea la gente desde la web (step-07/08); este step es solo config.
- Sin comentarios en código; documentar como reference markdown.
