---
name: "Step 01 — Migración a Cloudflare (Astro SSR)"
goal: "De Astro estático+gh-pages a Astro 7 SSR con @astrojs/cloudflare desplegable en Workers."
---

# Step 01 — Migración a Cloudflare (Astro SSR)

## Precondiciones

- Repositorio limpio (`git status` sin cambios) y `pnpm install` OK.
- Proyecto Astro actual 100% estático (solo `/`, `404`, `robots.txt.ts`, `llms.txt.ts`).

## Objetivo

El sitio se construye como **SSR (`output: 'server'`)** con el adapter oficial de Cloudflare, corre en Workers con `wrangler dev` y despliega con `wrangler deploy`, manteniendo prerender de las páginas de contenido.

## Pasos

1. **Adapter y config**
   - Instalar versiones **exactas** (sin caret, AGENTS.md): `pnpm add -E @astrojs/cloudflare` y `pnpm add -DE -E wrangler`.
   - `astro.config.mjs`: `output: 'server'` + `adapter: cloudflare(...)`, manteniendo Tailwind v4 via `@tailwindcss/vite` y la integración sitemap con su `serialize()` de imágenes. Guía: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
   - Prerender explícito en lo estático: `export const prerender = true` en `index.astro`, `404.astro`, `robots.txt.ts`, `llms.txt.ts`, y en toda página de contenido futura que no dependa de request.
2. **Wrangler**
   - `wrangler.jsonc` mínimo según la guía (compatibility_date, assets binding, main).
   - Añadir `.dev.vars` placeholder para secretos locales (se rellenan en step-02): `WIX_CLIENT_ID=`, `WIX_API_KEY=`, `WIX_API_KEY_ID=`, `WIX_SITE_ID=`. No commitear valores.
3. **Scripts y limpieza de deploy**
   - `package.json`: `preview: "astro preview"` → `wrangler dev` (o script `cf:dev`), `deploy: "pnpm build && wrangler deploy"`.
   - **Borrar** `gh-pages` del package.json y el script viejo de deploy a GitHub Pages (y de AGENTS.md la referencia si cambia el deploy).
   - `astro.config.mjs`: `site` de prod provisional `https://<subdominio>.workers.dev/` (futuro `namicrestaurant.com`); revisar `base` y `src/utils/functions.ts#baseUrl()`.
4. **Ajustes de SSR**
   - `src/layouts/layout.astro`: eliminar el import huérfano `logo-symbol.astro` (bug conocido del repo).
   - Recordatorio: assets llamados desde TS/JSX de Astro SIEMPRE con `baseUrl(...)`; CSS no lo necesita (AGENTS.md).
5. **Verificación**
   - `pnpm build` verde, `pnpm wrangler dev` sirve `/` con el mundo de scroll funcionando, `404/`.
   - Recordatorio de higiene: al cerrar sesión de tests, liberar el puerto 4321 (`netstat -ano | findstr :4321` + `taskkill //PID <pid> //F` del LISTENING); igual con 8787 (wrangler).

## Criterios de aceptación

- Build worker + payload estable con prerender correcto (sin páginas `-static` desaparecidas del sitemap).
- `wrangler dev` sirve index y 404. Nada roto del scroll/motion.
- `package.json` sin `gh-pages` y sin carets.

## Teardown

Cerrar sesiones `wrangler dev` y `astro dev`, liberar 4321/8787 (taskkill del PID LISTENING) antes de terminar.
