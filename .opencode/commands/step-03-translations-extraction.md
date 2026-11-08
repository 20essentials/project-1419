---
name: "Step 03 — Extracción de copy a translations.json"
goal: "Todo el copy (nami.ts + hardcodeado en .astro) se mueve a src/translations.json en inglés (fuente), con los textos actuales en español guardados como referencia para step-04."
---

# Step 03 — Extracción de copy a translations.json

## Precondiciones

- Branch de migración post step-01/02 (no depende de Wix).

## Objetivo

Cero texto de UI hardcodeado: un diccionario único de claves en `src/translations.json` (inglés, default del sitio) y un helper `t()` ligero propio.

## Pasos

1. **Inventario de copy**
   - Recorrer `src/data/nami.ts` (nav, faqs, experiencias, contacto, platos, prensa, seo, links) y el inline de los `.astro` (header, footer, dishes, experiences, faq, tagline, final-cta...).
   - Definir esquema de claves por área con estructura plana separada por puntos (patrón de project-1415): `nav.*`, `footer.*`, `reserve.*`, `carta.*`, `experiences.*`, `faq.*`, `legal.*`, `seo.*`.
2. **Diccionario fuente en inglés**
   - `src/translations.json` con todo el copy **en inglés** (tono Nami: sushi nikkei Barcelona). Los textos españoles actuales se guardan como referencia aparte (p. ej. `.opencode/references/spanish-copy-baseline.md` o branch) para pegarlos en el dashboard en step-04.
3. **Helper t()**
   - `src/i18n/t.ts` (~50 líneas): `getT(locale)` con lookup de claves, soporte de placeholders y fallback al valor fuente si falta la clave. Locale desde `Astro.currentLocale` (o param en step-05).
   - Sin dependencias nuevas (sin i18next) para mantener el bundle ligero; si i18next hace falta, instalar exacto y por decisión.
4. **Sustitución en plantillas**
   - Reemplazar todo texto inline por `t('clave')`.
   - `src/data/nami.ts` pasa a guardar estructura (ids, hrefs, metadatos de imágenes) pero **no strings de UI**; el texto se resuelve en componentes vía `t()` con id.
   - Los `alt` de imágenes y títulos SEO pasan también por claves.

## Criterios de aceptación

- `pnpm build` verde; el sitio se ve íntegro en inglés, mismo layout/motion.
- `grep` de cadenas literales en `src/components/**.astro` devuelve solo pocas (nada de UI sin clave).
- `src/data/nami.ts` sin strings de UI (solo estructura/ids/href).
- Sin comentarios en el código, archivos kebab-case (AGENTS.md).

## Notas

- No tocar `hreflang` ni canonical del layout en este paso (se normalizan en step-05).
- El inglés será el idioma default; si falta una clave al traducir, `t()` cae al inglés.
