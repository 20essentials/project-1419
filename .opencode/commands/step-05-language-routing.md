---
name: "Step 05 — Routing de idioma y SEO hreflang"
goal: "Astro i18n con inglés default sin prefijo + /es/ + /it/, selector de idioma en header, hreflang/canonical/sitemap correctos por locale."
---

# Step 05 — Routing de idioma y SEO hreflang

## Precondiciones

- Step-03 (t()) y step-04 (es.json/it.json reales) hechos.

## Objetivo

Multilingüe de verdad: inglés en `/`, `/carta/`, `/reserve/`... y equivalentes `/es/...` e `/it/...`, con SEO correcto.

## Pasos

1. **Config i18n de Astro**
   - `astro.config.mjs`: `i18n: { defaultLocale: 'en', locales: ['en', 'es', 'it'], routing: { prefixDefaultLocale: false } }` (verificar sintaxis contra la guía de Astro 7 en uso).
2. **Páginas**
   - `src/pages` plano (sin duplicar carpetas por idioma): cada `.astro` resuelve `Astro.currentLocale` y llama `getT(locale)`.
   - Actualizar `src/data/nami.ts#links`: `reservar` → `/reserve/` (slugs idénticos entre idiomas). El 301 de `/reservar/` queda apuntado en ROADMAP (extras).
3. **Selector de idioma**
   - `src/components/language-switcher.astro` en header: EN/ES/IT, enlazando a la misma ruta con el prefijo de cada locale (mapping manual simple de `Astro.path`).
   - Accesible: `aria-current="true"` en el activo, `aria-label` traducido, estilo Nami (kebab-case del archivo).
4. **Layout y head**
   - `<html lang={locale}>` en `src/layouts/layout.astro` (sustituye al `es-ES` actual).
   - `<link rel="alternate" hreflang="...">` para en/es/it + `x-default`.
   - Canonical absoluto del locale actual + `og:locale` y `og:locale:alternate` (patrón de project-1415).
5. **Sitemap**
   - `@astrojs/sitemap` con la config i18n (`locales`/`defaultLocale`) para que emita alternates; verificar que el `serialize()` custom de imágenes sigue intacto y que las 3 variantes aparecen.
6. **Detalles**
   - Los anclas del nav (`#nikkei`, `#carta`...) funcionan en las 3 locales.
   - (Opcional) pequeño script de preferencia: si el navegador trae `it`/`es` y el visitante aterriza sin idioma elegido, un banner discreto sugiere el idioma; sin redirect automático agresivo.

## Criterios de aceptación

- `/` en inglés; `/es/` y `/it/` renderizan con su copy (es completo, it con fallback a inglés donde falte).
- `hreflang`, `canonical`, `og:locale` y sitemap con alternates correctos (grep en el build o Lighthouse).
- El switcher mantiene la página actual al cambiar de idioma.

## Notas

- Sin comentarios en el código; archivos kebab-case (AGENTS.md).
- Cerrar sesiones `astro dev` / `wrangler dev` y liberar 4321/8787 al terminar el paso.
