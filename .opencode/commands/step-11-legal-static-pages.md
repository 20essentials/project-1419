---
name: "Step 11 — Páginas legales y /regalar/"
goal: "/legal/, /privacidad/, /cookies/ y /terminos-compra/ publicadas en los 3 idiomas; /regalar/ como landing de gift cards (compra real en step-15)."
---

# Step 11 — Páginas legales y /regalar/

## Precondiciones

- Steps 03–05 (i18n y t()) hechos.

## Objetivo

Las rutas reservadas en `src/data/nami.ts#legal` y `links.regalar` existen con copy real en inglés/es/it.

## Pasos

1. **Páginas legales**
   - `src/pages/legal/index.astro`, `src/pages/privacidad/index.astro`, `src/pages/cookies/index.astro`, `src/pages/terminos-compra/index.astro`.
   - Layout simple con Header/Footer, `prerender = true`, breadcrumb mínimo.
   - Copy en inglés por defecto (empresa ficticia Nami, contacto hola@namicrestaurant.com, RGPD/LSSI-cookies): bloques largos de texto. Si se alargan, moverlos a un componente reutilizable `legal-doc.astro` con secciones por datos del archivo.
   - Claves `legal.*` en translations.json (traducción es pendiente del dashboard; it con fallback).
2. **Landing /regalar/ (shell)**
   - `src/pages/regalar/index.astro`: hero + explicación + opciones de importe + CTA "Buy a gift card" que (por ahora) aún no compra (step-15 la conectará).
   - URL unificada `/regalar/` en los 3 idiomas (slugs idénticos de step-05).
   - JSON-LD básico (Product/Offer) si aplica.
3. **SEO por página**
   - Title/description por locale (`seo.legal.*` y `seo.regalar.*`), canonical + hreflang heredados del step-05.
4. **Chequeo de enlaces**
   - Footer y nav ya apuntan a estas rutas (`links.legal` en nami.ts): verificar 0 broken links en build/sitemap.

## Criterios de aceptación

- 4 páginas legales + `/regalar/` accesibles en `/`, `/es/` e `/it/` con su copy (es completo, it con fallback donde falte).
- Sitemap las incluye; hreflang y canonical correctos.
- Sin comentarios; archivos kebab-case.

## Notas

- La compra real de gift cards (cart + checkout + orders) es step-15; aquí solo shell visual.
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).
