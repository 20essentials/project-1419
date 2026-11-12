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

- No pedir al propietario más de una vez: si no responde, dejar la decisión documentada como `parket` en el Resultado y no inventar el flujo.
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

⏳ pending — existe su step file, sin ejecutar.
