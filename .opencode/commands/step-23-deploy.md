---
name: "Step 23 — Deploy a Cloudflare (publish del sitio)"
goal: "Publicar el sitio en Cloudflare: wrangler login + wrangler deploy, validar la URL real y (a futuro) el dominio namicrestaurant.com."
---

# Step 23 — Deploy a Cloudflare (publish del sitio)

Paso **deferido**: se ejecuta cuando el owner quiera publicar; no bloquea steps 02–15. Puede repetirse tras cualquier cambio o cada vez que se despliega contenido nuevo (es el único "deploy" del proyecto).

## Precondiciones

- Step-01 hecho (`build(cloudflare)` commiteado, build verde en local).
- Cuenta de Cloudflare con acceso (el que ejecutará debe poder `wrangler login`).
- En CI (futuro): cuenta de deploy dedicada o API token `cloudflare-astro` sin interactive login.

## Objetivo

URL pública real servida por Workers: obtener el subdominio workers.dev (o dominio propio) y validar que `site` de `astro.config.mjs` apunta ahí (sitemap, canonical, og:image).

## Pasos

1. **Login y deploy**
   - `pnpm wrangler login` (browser flow; una vez por máquina).
   - `pnpm deploy` (script `astro build && wrangler deploy` del package.json).
   - Anotar la URL entregada (`https://nami-sushi.<subdominio>.workers.dev`).
2. **Bindings auto-provisionados (no tocar, solo anotar)**
   - Al primer deploy el adapter provisiona el KV **SESSION** (uso futuro de sessions).
   - El binding **IMAGES** no aplica: usamos `imageService: compile` (build-time con sharp).
   - Revisar el deploy en el dashboard de Workers y anotar name/account.
3. **Site URL definitiva**
   - Regla: `site` de `astro.config.mjs` debe coincidir con la URL pública real del deploy (sitemap, canonical y og:image derivan de ahí).
   - Si el dominio propio aún no existe, decidir si `site` queda en el subdominio workers.dev publicado o en `https://namicrestaurant.com/` como placeholder futuro (coherente en todos los outputs).
4. **Dominio propio (a futuro, cuando exista)**
   - Registrar namicrestaurant.com (nota de "Siguientes pasos" en AGENTS.md).
   - En Cloudflare dashboard > Workers > nami-sushi > Settings > Domains & Routes: add custom domain `namicrestaurant.com` (apex) y `www`.
   - Cambiar nameservers del registrar a Cloudflare (o DNS CNAME si el dominio no está en Cloudflare).
   - `pnpm deploy` de nuevo y re-verificar.
5. **Validación post-deploy**
   - `/`, `/404` (ruta inválida → 404), `robots.txt`, `sitemap-index.xml` responden 200 desde la URL real.
   - `<link rel="canonical">` y hreflang usan esa URL (curl y comparar contra `site`).
   - Mundo de scroll y viewport móvil OK (landing por ahora).
6. **Secretos (una vez existan, desde step-02)**
   - `pnpm wrangler secret put WIX_API_KEY` (y `WIX_API_KEY_ID`, `WIX_SITE_ID`); `WIX_CLIENT_ID` va como var pública en `wrangler.jsonc#vars`. Nunca commitear valores.

## Criterios de aceptación

- `pnpm deploy` termina sin error y la URL workers.dev (o dominio) sirve el índice y las prerenders (200).
- Sitemap/canonical con el dominio real, no con `http://localhost`.
- Si la URL pública cambia respecto a `site`, `astro.config.mjs` actualizado y re-deploiado.
- ROADMAP/README actualizados con la URL pública si procede.

## Notas

- Las URLs de las paginas son SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): AGENTS.md. Los step docs ya ejecutados (01–16) citan slugs viejos en espanol a proposito: no reescribirlos al ejecutar este step.
- Si el dominio propio aún no existe, el deploy igual es válido: los auth redirects de Wix (allow-list del step-02) deben linkear la URL PÚBLICA REAL elegida.
- Deploy re-pedido tras cada `wix translation pull` (Fase 1) — el deploy es manual durante el proyecto (ROADMAP "Extras futuros": deploy hook opcional).
- Liberar puerto local al terminar la validación (AGENTS.md).

## Resultado

- 2026-11-15: cuenta `d960960gm@gmail.com` (`6e282139d74dddffddc8affdd92a11c1`) verificada; `wrangler login` OAuth OK.
- Worker `nami-sushi` publicado en `https://nami-sushi.nami-sushi.workers.dev` (Version ID `51109f61-a18d-43d5-8260-ee96ffbd7b7f`).
- KV `SESSION` provisionado como `nami-sushi-session` (`c427c19f2d9b4e198200952223b34268`) y fijado en `wrangler.jsonc#kv_namespaces`; sin el id, el segundo deploy falla con `10014` al re-provisionar.
- `WIX_CLIENT_ID` como var pública en `wrangler.jsonc#vars`; `WIX_API_KEY`, `WIX_SITE_ID` y `WIX_CLIENT_SECRET` subidos con `wrangler secret bulk` (fichero temporal borrado).
- Validación: `/`, `/menu/`, `/reserve/`, `/legal/`, `/robots.txt`, `/sitemap-index.xml` 200; ruta inexistente 404. Canonical `https://nami-sushi.nami-sushi.workers.dev/` y hreflang en/es/it/x-default correctos.
- **Decisión del owner (2026-11-15):** no habrá dominio propio; la URL pública y canónica es `https://nami-sushi.nami-sushi.workers.dev/` (`site` actualizado y re-deploy, Version ID `8e3731e8-4a68-4480-80a3-1622aa5b5b7f`).
- Pendiente para step-24: añadir esa URL a la allow-list de redirects de Wix antes de probar login en producción.
