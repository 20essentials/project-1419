# Reserve API contract — step-07 (fuente de verdad para step-08 / E2E)

Rutas SSR `/api/reserve/*` implementadas con `ApiKeyStrategy` (admin-client, `src/shared/wix/admin-client.ts`).
La página `/reserve/` (step-08) **nunca** habla con Wix: solo con estas rutas. La API key jamás sale del server.

La disponibilidad real se calcula `server-side` (slots via `timeSlots.getTimeSlots` + proyección para experiencias);
los errores de negocio nunca devuelven 500. Todo el copy de error para el usuario se traduce en el front (step-08)
con estas claves; aquí solo viajan códigos.

## Archivos

- `src/features/reserve/site-time.ts` — TZ Europe/Madrid: `siteToday`, `localWindow` (hoy → +60 días), `minutesUntil`, `localToInstant` (local Madrid → instante UTC con doble pasada de offset DST), `instantToLocalTime`, `isLocalDate`, `isLocalTime`, `weekdayOfLocalDate`, `MAX_ADVANCE_DAYS`.
- `src/features/reserve/reservation-context.ts` — `getReserveContext()` (location default + experiences, todo dinámico) y `findExperience()`.
- `src/features/reserve/reserve-slots.ts` — `listReserveSlots(date, partySize, experienceId?)`, `listReserveSlots` valida formato/rango/partySize; `slotIsAvailable()` reutilizado por el POST.
- `src/features/reserve/create-reservation.ts` — `createReserveBooking()` + `mapWixFailure()` + `maskEmail()`.
- `src/features/reserve/reserve-error.ts` — `ReserveError(code, status, message)`, `RESERVE_ERROR_STATUS` (INVALID_INPUT 400, EXPERIENCE_NOT_FOUND 404, NO_AVAILABILITY 409, PREMIUM_ONLY 428, RESERVATION_UNAVAILABLE 502), helpers `jsonOk`/`jsonError`.
- `src/pages/api/reserve.ts` (POST `/api/reserve`), `src/pages/api/reserve/setup.ts`, `src/pages/api/reserve/slots.ts` (routes thin).

## GET /api/reserve/setup

Cache: `Cache-Control: public, max-age=600`. Respuesta 200 (estado real 2026-11-09 del sitio):

```json
{
  "timeZone": "Europe/Madrid",
  "onlineReservationsEnabled": true,
  "approvalMode": "AUTOMATIC",
  "partySize": { "min": 1, "max": 8 },
  "minimumReservationNotice": { "number": 60, "unit": "MINUTES" },
  "defaultTurnoverTime": 90,
  "timeSlotInterval": 15,
  "advanceWindowDays": 60,
  "schedule": [
    { "openDay": "MONDAY", "openTime": "13:00", "closeDay": "MONDAY", "closeTime": "23:00" }
  ],
  "experiences": []
}
```

- `schedule` = 7 periodos LUN–DOM 13:00–23:00 (leído dinámico; NO hardcodear en el front).
- `experiences[] = { id, slug, labelKey, partySize{min,max}|null, pricePerGuest, currency, durationInMinutes, schedule[] }`.
  - `labelKey = reserve.experience.<slug-o-kebab-del-nombre>` para traducir en el front (no hay experiencias creadas: el sitio responde `[]`).
  - Sin texto de negocio viajando de Wix: solo ids/datos no textuales (cumple step-07).
- Error: 502 `RESERVATION_UNAVAILABLE` si Wix no responde (sin 500).

## GET /api/reserve/slots?date=YYYY-MM-DD&partySize=N&experienceId=...

Cache: `no-store` (disponibilidad real). 200:

```json
{
  "timeZone": "Europe/Madrid",
  "date": "2026-11-16",
  "partySize": 2,
  "slots": [ { "time": "13:00", "available": true }, { "time": "10:30", "available": false } ]
}
```

- Times en hh:mm local Europe/Madrid, interval = `timeSlotInterval` (15 min), día completo (13:00–23:00 configurado).
- Sin experiencia: `available = (Wix status AVAILABLE) && (minutos hasta el slot >= notice 60)`.
- Con experiencia: proyección del `businessSchedule` de la experiencia (weekly + oneTime), `available = notice` (la capacidad la decide `createReservation` server-side).
- Errores: 400 `INVALID_INPUT` (date inválido / fuera de ventana / partySize fuera de rango), 404 `EXPERIENCE_NOT_FOUND`, 502 `RESERVATION_UNAVAILABLE`.

## POST /api/reserve

Body:

```json
{
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "partySize": 2,
  "experienceId": "<opcional>",
  "firstName": "Ana",
  "lastName": "Serrano",
  "email": "ana@example.com",
  "phone": "+34600123456",
  "note": "opcional, max 500"
}
```

200 (verificado en humo real; `createReservation` devolvió `RESERVED`):

```json
{
  "reservation": {
    "id": "ca9323d9-7635-4319-a8c1-96c75f204c22",
    "status": "RESERVED",
    "localStart": "2026-11-16T14:00:00",
    "partySize": 2
  }
}
```

- With `experienceId`: añade `"experienceId"` al objeto devuelto (viaja por `details.experienceId` con cast: el type SDK `Details` no lo trae).
- approval AUTOMATIC → status esperado `RESERVED`; con approval manual sería `REQUESTED` (pintar ambos en el UI).
- `note` se valida y se loguea, pero NO viaja en el payload (el esquema REST no tiene campo de notas).
- Validaciones previas: formatos date/time, ventana hoy→+60 días, partySize (intersección location∩experiencia), firstName+phone (+34 formato `+?dígito{7,15}`), email, notice 60 min.
- El slot pedido debe existir Y estar disponible en la misma lógica de slots → si no: 409.

Mapeo de errores (los códigos a pintar en el front, con status HTTP):

| Status | Codigo | Cuando |
|:--|:--|:--|
| 400 | `INVALID_INPUT` | formatos, partySize, email/teléfono, JSON inválido |
| 404 | `EXPERIENCE_NOT_FOUND` | experienceId desconocido |
| 409 | `NO_AVAILABILITY` | slot fuera de horario/pasado por notice/dedo, o Wix `TIME_NOT_AVAILABLE` |
| 428 | `PREMIUM_ONLY` | Wix `MUST_BE_PREMIUM`/`PREMIUM_ONLY` (trial: "reservas online aún no activas") |
| 502 | `RESERVATION_UNAVAILABLE` | fallo de Wix no mapeado / falta `_id` en la respuesta |

Nunca 500. Todos los errores: `{ "error": "<CODIGO>", "detail": "<mensaje interno en español, no para el usuario>" }`.

## Observabilidad

- `console.info('[reserve] create <date> <time> <party> table|experience <id> <email maskado> -> <status>')` (email: `te***@namic…`), `console.info('[reserve] intento …')`, `console.error('[reserve] …')` para fallos Wix/premium. Nada de PII completa.

## Humo verificado (2026-11-09, `pnpm build + pnpm preview`, proyecto Wix real)

- setup 200 con config real (notice 60, turnover 90, interval 15, schedule LUN–DOM 13:00–23:00, onlineReservationsEnabled true).
- slots 200: 96 slots, 41 disponibles 13:00–23:00 (el +7 días, partySize 2); malformed → 400; partySize 20 → 400 detail rango.
- POST válido → 200 RESERVED (id real); time 10:00 → 409 NO_AVAILABILITY; email inválido → 400.
- `experienceId=no-existe` → 404 EXPERIENCE_NOT_FOUND.
- En la respuesta no viaja ningún dato sensible (API key ni credenciales).
- Gotcha leído del SDK real: la config llega en `configuration.onlineReservations.*` (no aplanado), ids como `_id`; gotcha getTimeSlots: args posicionales, `date` ancla una hora (no el día) → `slotsBefore/slotsAfter 50` obligatorio para cubrir el día (máximo 50 por llamada).
