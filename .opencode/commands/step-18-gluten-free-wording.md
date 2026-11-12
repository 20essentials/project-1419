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

- Si el propietario no responde, dejar documentado como `parket` (no inventar claim médico/legal).
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

⏳ pending — existe su step file, sin ejecutar.
