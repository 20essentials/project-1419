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

✅ done (2026-11-14)

- **Política definida con el propietario**: cancelación/cambio gratis hasta 24 h antes (teléfono +34 931 27 08 15 o email); sin pago previo, nada que reembolsar; mesa se guarda 15 min desde la hora reservada (no-show aviso suave); no se toca `/purchase-terms/` (decisión del owner). Coherente con step-06 (approval AUTOMATIC, notice 60 MIN; sin cobro por adelantado no hay reembolso que documentar).
- **FAQ**: nuevo item `cancel` añadido a `faqIds` en `src/shared/site/nami.ts` (tras `experiences`); claves `faq.items.cancel.q/.a` en en + seed es/it vía REST `translation-content/v1/bulk/contents/create` (schemaId `e2aa6aa7-…`, field `static-field`, `{ textValue, updatedBy: 'USER', published: true }`, entityId = clave, chunks por locales × claves): 8/8 (200). JSON-LD FAQPage en home lo recoge automáticamente (usa `faqIds`).
- **Wizard**: nota de política en el panel 4 (paso del formulario) en `wizard.astro`, bajo `data-summary`, con enlace `${homeHref}#questions`; claves nuevas `reserve.policy.note` y `reserve.policy.link` (en + seed es/it, mismas 8/8 del bulk).
- **Cierre del pending**: `pendingFaqs` → `[]` en `nami.ts` (el `<Pending>` de `faq.astro` queda y no renderiza nada); clave `pending.faqCancel` borrada de `src/translations.json` → `translations:push` OK → `translations:pull` roundtrip limpio (0 restos en en/es/it; `reserve.policy.*` y `faq.items.cancel.*` presentes en es/it, propagación instantánea en este caso).
- **Smoke**: build verde; prerender de `/`, `/es/`, `/it/` y `/reserve/`, `/es/reserve/`, `/it/reserve/` con la política visible en los 3 idiomas y 0 "Pending" en HTML prerenderizado. E2E 33 passed + 1 skipped (contract real opt-in) tras el cambio del wizard; `[free-port] 4321 y 8787 libres`.
