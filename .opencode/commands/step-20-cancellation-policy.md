---
name: "Step 20 — Política de cancelación"
goal: "Política de cancelación definida por el propietario, publicada en el FAQ (3 idiomas) y enlazada desde el wizard de reserva; Pending del FAQ eliminado."
---

# Step 20 — Política de cancelación

## Precondiciones

- Steps 03–05 (i18n), 06 (reservation config: approval AUTOMATIC, notice 60 MIN) y 08 (wizard) hechos.

## Objetivo

Resolver el pending `pending.faqCancel`: "Can I cancel or change my reservation? The cancellation policy is missing."

## Pasos

1. **Definir la política (bloqueante, preguntar antes de escribir)**
   - Confirmar con el propietario: ventana de cancelación/modificación, no-show, reembolso si aplica, y coherencia con la config de step-06 (`minimumReservationNotice`, `approval`).
2. **Publicarla**
   - FAQ: actualizar/crear la respuesta en `faqIds` (3 idiomas, push + pull + seed es/it).
   - Wizard: nota de política en el paso del formulario (`reserve.*`, nueva clave i18n) y enlace al FAQ.
   - Si la política lo exige, actualizar el copy legal de `/purchase-terms/` (`legal.purchase.*`).
3. **Cerrar el pending**
   - Quitar `faqCancel` de `pendingFaqs` en `src/shared/site/nami.ts`; borrar la clave `pending.faqCancel` (push + pull).
4. **Smoke**
   - `/faq/` y `/reserve/` en en/es/it 200 con la política visible; sin Pending; E2E existente sigue verde (el form del wizard cambió).

## Criterios de aceptación

- 0 pendings de cancelación en el render; política coherente con la config real de Wix (step-06).
- E2E 10 verdes tras el cambio del wizard; puerto 4321 liberado.

## Notas

- Las URLs de las paginas son SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): AGENTS.md. Los step docs ya ejecutados (01–16) citan slugs viejos en espanol a proposito: no reescribirlos al ejecutar este step.
- Sin decisión del propietario → `parket` en el Resultado (no inventar condiciones de cancelación).
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

⏳ pending — existe su step file, sin ejecutar.
