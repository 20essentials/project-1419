---
name: "Step 11 — Páginas legales y /regalar/"
goal: "/legal/, /privacidad/, /cookies/ y /terminos-compra/ publicadas en los 3 idiomas; /regalar/ como landing de gift cards (compra real en step-15)."
---

# Step 11 — Páginas legales y /regalar/

## Precondiciones

- Steps 03–05 (i18n y t()) hechos.

## Objetivo

Las rutas reservadas en `src/shared/site/nami.ts#legal` y `links.regalar` existen con copy real en inglés/es/it.

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

## Resultado

✅ Ejecutado (2026-11-10). 4 páginas legales + `/regalar/` en en/es/it, prerenderizadas y en sitemap.

**Páginas**

- `src/pages/legal/index.astro`, `privacidad/index.astro`, `cookies/index.astro`, `terminos-compra/index.astro`: thin, `prerender = true`, Layout con title/description propios.
- `src/features/legal/legal-content.ts`: modelo de documentos (6/8/5/7 secciones) con claves `legal.<id>.sections.<n>.{heading,body}`.
- `src/features/legal/legal-doc.astro`: breadcrumb, h1 + intro + fecha, secciones, bloque de contacto (email/tel) y nav entre documentos legales. Todo el copy vía `t()`.
- `src/pages/regalar/index.astro` + `src/features/gift/regalar.astro`: hero con foto, 3 opciones (Short €150, Full €250, importe libre), cómo funciona en 3 pasos, CTA shell (mailto) + nota de "compra online pronto" y enlace a condiciones. JSON-LD `Product/Offer + WebPage` en `src/features/gift/gift-schema.ts`.

**i18n (94 claves nuevas, 246→340)**

- `seo.legal.{notices,privacy,cookies,purchase}.*`, `seo.regalar.*`, `legal.*` (documentos + `breadcrumb/home/lastUpdated/contact/navLabel`) y `gift.landing.*`.
- `wix translation push --json` + seed es/it vía REST `translation-content/v1/bulk/contents/create` (schemaId `e2aa6aa7-…`, chunks de 25) + `translation pull`: es 338/340 e it 338/340 (faltan solo los `carta.dishes.*.detail` vacíos, que caen a en).
- Enlaces internos localizados: footer legal y CTA de la home `gift` ahora usan `localizedPathname(...)`; `/es/` e `/it/` apuntan a `/es/…` y `/it/…`.

**Smoke (`pnpm build && pnpm preview`, 4321, cerrado)**

- 15/15 rutas nuevas 200 (`/legal/`, `/privacidad/`, `/cookies/`, `/terminos-compra/`, `/regalar/` × en/es/it); `/no-existe/` 404; port liberado.
- Title/description/canonical/hreflang/x-default correctos por locale; sitemap incluye las 15 URLs; JSON-LD de `/regalar/` parsea (`Product`, `WebPage`).
- Checker de enlaces internos sobre el HTML construido: 0 rotos (whitelist `/carta/` por ser SSR).
- `pnpm test:e2e`: 10/10 mocks verdes, 1 skip opt-in; `[free-port] 4321 y 8787 libres`.

Siguiente: `step-12-auth-core`.
