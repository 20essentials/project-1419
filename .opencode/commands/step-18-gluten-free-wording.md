---
name: "Step 18 — Validación del wording gluten-free"
goal: "La respuesta del FAQ 'gluten-free' validada con el restaurante y el Pending eliminado de los 3 idiomas."
---

# Step 18 — Validación del wording gluten-free

## Precondiciones

- Steps 03–05 (i18n) hechos.

## Objetivo

Resolver el pending `faq.items.gluten-free.pending`: "Validate the allergy wording with the restaurant."

## Pasos

1. **Validar con el propietario (bloqueante, preguntar antes de tocar copy)**
   - Enviar el texto actual de `faq.items.gluten-free.*` (en/es/it) y confirmar que el restaurante avala la redacción (alergias/menú sin gluten, disclaimers legales).
   - Recoger la versión final aprobada en los 3 idiomas.
2. **Actualizar el copy**
   - PATCH de las claves `faq.items.gluten-free.answer` en translations.json + push + pull; seed es/it si se edita solo en en.
3. **Cerrar el pending**
   - Eliminar el `<Pending>` condicional de `src/features/faq/faq.astro` (queda el mecanismo `hasKey` para futuros FAQ) y borrar la clave `faq.items.gluten-free.pending` (push + pull).
4. **Smoke**
   - `/faq/` en en/es/it 200, respuesta visible sin Pending.

## Criterios de aceptación

- 0 pendings de gluten-free en el render; wording avalado por el propietario (citado en el Resultado).
- Claves en los 3 idiomas actualizadas; puerto 4321 liberado.

## Notas

- Las URLs de las paginas son SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): AGENTS.md. Los step docs ya ejecutados (01–16) citan slugs viejos en espanol a proposito: no reescribirlos al ejecutar este step.
- Si el propietario no responde, dejar documentado como `parket` (no inventar claim médico/legal).
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

✅ done (2026-11-14)

- **Aval del propietario**: la redacción actual de `faq.items.gluten-free.*` (en/es/it) queda aprobada tal cual — el restaurante avala "All the soy we serve in the dining room is gluten free. If you have any allergy or intolerance, call us at +34 931 27 08 15 before you come." y sus traducciones es/it sin cambios de copy (no hubo PATCH).
- **Cierre del pending**: clave `faq.items.gluten-free.pending` borrada de `src/translations.json` + `translations:push` (success) + `translations:pull` — el pull ya no devuelve la clave en ninguna locale (en/es/it). En `faq.astro` se eliminó el bloque `<Pending>` condicional del loop `faqIds` (el mecanismo `hasKey` queda disponible en `shared/i18n/t` para futuros FAQ); el `<Pending>` de `pendingFaqs` se conserva para `pending.faqCancel` (step-20). Nota: un primer build falló con "Pending is not defined" porque el import de `Pending` se había quitado junto con el condicional del loop; restaurado.
- **Smoke**: `pnpm build` OK; `/`, `/es/`, `/it/` → 200 con la respuesta gluten-free visible en las 3 locales (también en el JSON-LD de FAQPage) y 0 restos del texto de pending en el render. Puerto 4321 liberado (PID 16360 terminado).
