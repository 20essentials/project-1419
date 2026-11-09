# Reservations config — estado real en Wix (step-06)

Configurado el 2026-11-09 vía REST (API key admin + `wix-site-id`). Contrato verificado con docs (`/locations/v1/locations` UpdateLocation, `/table-reservations/.../update-reservation-location` UpdateReservationLocation).

## Business location (Locations API)

- `id`: `f3291845-5bef-4c72-9d16-35e113039be8`, `default: true`, revision `2`
- name `Nami`, diag `Nikkei cuisine in Eixample, Barcelona`
- address: ES / Barcelona / 08008 / Passeig de Gràcia 24, geocode 41.3922385 / 2.1636479
- `timeZone: Europe/Madrid`, email `hola@namicrestaurant.com`, phone `+34931270815`

## Reservation location (Table Reservations)

- `id`: `f3291845-5bef-4c72-9d16-35e113039be8` (mismo id que la business location), revision `2`
- `approval.mode: AUTOMATIC` (ya venía así del install; no se tocó)
- `partySize: 1–8` (antes 1–6 por entrenamiento desde plantilla)
- `minimumReservationNotice: { number: 60, unit: 'MINUTES' }` (antes 30)
- `defaultTurnoverTime: 90` (default de la app, sin patch extra)
- `timeSlotInterval: 15` (default de la app, sin patch extra)
- `businessSchedule`: LUN–DOM 13:00–23:00 (7 periodos; antes 08:00–22:00). Alineado con el horario real publicado: "todos los días 13:00–00:00, cocina hasta 23:00". Última hora de reserva no configurable por API: los slots se generan según schedule y turnover.
- `onlineReservationsEnabled: true` a la LECTURA. El intento de PATCH `onlineReservationsEnabled: true` respondió `428 { code: 'PREMIUM_ONLY', message: "Can't turn on online reservation for a non-premium website" }` → **precondición del owner: upgrade a plan premium** (mismo gate que ya documentaba el riesgo #1 de ROADMAP). El apartado continúa leyéndose `true`: el write de reservas (`hold`/`reserve`) será el que decida.

## Smoke tras config (200 en todos)

- `GET /locations/v1/locations` → default = Nami/Barcelona OK
- `GET /table-reservations/reservation-locations/v1/reservation-locations` → default con la config de arriba
- `POST /table-reservations/reservations/v1/time-slots` (partySize 2, +7 días, UTC) → slots `AVAILABLE` con `duration: 90`
- Admin-client del proyecto (`@wix/table-reservations` + ApiKeyStrategy) verificado previamente en step-02; usa esta misma API key/site-id.

## Gotchas confirmados en la práctica

1. **PUT de location es FULL y exige `default` echo**: actualizar sin `"default": true` responde `400 CHANGE_DEFAULT_FORBIDDEN` ("Changing default from true to false is not allowed").
2. **El `location` espejo dentro de la reservation-location sirve desactualizado** (aún muestra name `Location 1`, veroña/Europe-Verona tras el PATCH). La realidad está en `GET /locations/v1/locations` (muestra Nami/Barcelona correcto). `/reserve/` no debe leer del espejo.
3. **428 PREMIUM_ONLY al activar online reservations**; esperado en trial, no fatal, ver arriba.
4. Las tables/areas (`tableManagement`, área `Sala ristorante`) son defaults de plantilla italiana pendientes de ajuste con el owner (no bloquean step-07/08, que usa slots, no mesas concretas).

## Contrato para step-07/08

- NADA de esto se hardcodea en `/api/reserve`: todo lectura dinámica de `listReservationLocations()` (id, partySize, schedule, notice, interval, approval) + `locations.listLocations()` (tz, datos de contacto).
- Solo write válido: `time-slots` (lectura de slots) y creaciones de reserva desde el flujo de la web; no POSTs de locations ni PATCHs desde el código de la app.
