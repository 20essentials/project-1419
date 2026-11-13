---
name: "Step 17 — Experiencias: ¿se piden al reservar o en mesa?"
goal: "Decisión del propietario implementada: el CTA de cada experiencia lleva el menú elegido (experienceId del wizard de reserva) o queda reserva simple; Pending de experiences y del FAQ resueltos."
---

# Step 17 — Experiencias: ¿se piden al reservar o en mesa?

## Precondiciones

- Steps 07–08 (Reserve API + wizard con `experiences` del contexto) y step-09 hechos.

## Objetivo

Resolver el pending `experiences.pending` y su duplicado `pending.faqExperiences`: "Do guests order the experiences when booking or at the table? Depending on the answer, each card's button could already carry the chosen menu."

## Pasos

1. **Decisión del propietario (bloqueante, preguntar antes de codear)**
   - Opción A: la experiencia se selecciona al reservar → los CTAs de las cards llevan la experiencia elegida hasta `/reserve/`.
   - Opción B: la experiencia se pide en mesa → los CTAs quedan como reserva simple y se aclara el copy ("the experience is chosen at the table").
2. **Implementar según la opción elegida**
   - A: `src/features/experiences/experiences.astro` → cada CTA apunta a `/reserve/?experience=<id>`; el wizard (`src/features/reserve/`) lee el query param al arrancar, preselecciona el paso y lo envía como `experienceId` en el POST (la API ya lo soporta: `src/features/reserve/create-reservation.ts`).
   - B: solo copy — actualizar `experiences.body` / FAQ `experiences` para indicar que se elige en mesa.
3. **Experiences reales en Wix**
   - Configurar las experiencias en el dashboard Wix (Table Reservations) si no existen, o mapear los ids de `experiencias` en `src/shared/site/nami.ts` con los `experience.id` reales del `reservation-context` (hoy el dashboard trial devuelve `experiences: []`).
   - Verificar con smoke que `setup` devuelve las experiences y que el wizard las lista.
4. **Cerrar los pendings**
   - Eliminar `<Pending>` de `experiences.astro` y `faqExperiences` de `pendingFaqs` (`src/shared/site/nami.ts`); borrar las claves `experiences.pending` y `pending.faqExperiences` (push + pull).
   - FAQ "Experiences" queda con respuesta definitiva en 3 idiomas.

## Criterios de aceptación

- 0 pendings de experiences en el render; la pregunta respondida y visible en la página.
- Si opción A: E2E (Playwright) del flujo con experience preseleccionado verde + POST con `experienceId` verificado.
- Claves actualizadas en en/es/it (push + seed); puerto 4321 liberado.

## Notas

- Las URLs de las paginas son SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): AGENTS.md. Los step docs ya ejecutados (01–16) citan slugs viejos en espanol a proposito: no reescribirlos al ejecutar este step.
- No pedir al propietario más de una vez: si no responde, dejar la decisión documentada como `parket` en el Resultado y no inventar el flujo.
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

✅ done — Decisión del propietario: **Opción A, la experiencia se elige al reservar**.

- **CTAs**: `experiences.astro` → cada card enlaza `/reserve/?experience=<short|full>` (experiences.body actualizado en en/es/it: "pick your experience when you book online").
- **Wizard** (`wizard.astro` + `wizard-client.ts`): paso 1 muestra pills "Reservation type" (solo mesa + experiences del setup), preselecciona por query param (match por `id`/`slug`/sufijo de `labelKey`), clamp de comensales a los límites de la experiencia, `experienceId` va en `GET /api/reserve/slots` y en el POST (la API ya lo soportaba); sin match cae en solo mesa; sin experiences el bloque se oculta. `reservation-context.ts` expone el `name` crudo para fallback de etiquetas.
- **Experiences reales en Wix**: creadas vía REST `table-reservations/experiences/v1/experiences` — `short` (610f6360-f858-486a-91a0-9cc0f622dc24, 75 €/comensal, 2–6, 90 min) y `full` (a9d265cd-8150-491e-a6cb-dd5efa01b875, 125 €/comensal, 2–8, 150 min), schedule semanal 13:00/14:00/19:00/20:00/21:00, notice 60 min heredado de la location. Smoke real: `setup` 200 con las dos experiences y `onlineReservationsEnabled: true`; slots proyectados por el schedule de la experiencia; wizard en vivo preselecciona con `?experience=short`.
- **FAQ**: nuevo item `experiences` en `faqIds` ("Do I choose the experience when I book?" en/es/it); `<Pending>` fuera de `experiences.astro` y de `scroll-world.astro` (stop how-it-works); `faqExperiences` fuera de `pendingFaqs`.
- **i18n**: `translations:push` OK → seed es/it vía REST `translation-content/v1/bulk/contents/create` (4 claves nuevas × 2, 8/8) + `update-by-key` (`experiences.body` × 2, 2/2) → `pull` roundtrip limpio (la propagación a es/it tarda ~30 s tras el seed; primer pull los devuelve ausentes).
- **Tests**: `reserve-flow.spec.ts` +4 tests (preselección con POST/slots con `experienceId`, pill solo mesa sin `experienceId`, query desconocido, setup sin experiencias); fixture `reserve-setup-mock.json` con short/full reales de ejemplo. Suite completa 33/33 verde; puerto 4321 liberado.
