---
name: "Step 22 — Traducciones runtime + Astro.cache (Riesgo 4)"
goal: "Leer las traducciones es/it de Wix en runtime (con caché de 5 min en KV) para que una edición del dashboard se vea en producción sin rebuild ni deploy, eliminando el cron de traducciones."
---

# Step 22 — Traducciones runtime + Astro.cache

Paso **deferido (parket)**: se ejecuta cuando el propietario lo pida, después de step-23 (Worker publicado) y de step-24 (auth en producción). Ataca el **Riesgo 4** del ROADMAP: hoy el copy es/it vive en `.wix/multilingual/translations/*.json` importado en build, así que cada edición del dashboard exige `wix translation pull` + build + deploy manual.

**Decisión cerrada:** no hay cron ni deploy hook. Las locales se leen en runtime con caché corta; el JSON del build queda como fallback y para el sitemap.

## Precondiciones

- Step-100 hecho: Worker `nami-sushi` publicado y `wrangler deploy` operativo.
- Step-04/05 hechos: locales es/it y claves en Wix Multilingual; `WIX_API_KEY`/`WIX_SITE_ID` ya son secretos del Worker (step-23).
- Cuenta Wix con permiso de lectura de traducciones para esa API key (si el scope falla, crear una key dedicada y rotarla).
- `wix@1.2.9` y `wrangler@4.158.0` exactos; Node >= 24.22.1; pnpm.

## Objetivo

- Edición de copy en el dashboard de Wix visible en `en/es/it` en **≤ 5 min**, sin rebuild ni deploy.
- Si Wix falla o la key no responde, el sitio sigue sirviendo el último diccionario cacheado; si no hay caché, el JSON del build.
- Sin cron, sin commits automáticos, sin deploys vacíos.
- `wix translation pull` sigue en `pnpm build` solo para fallback offline y para el sitemap.

## Arquitectura

1. **Fuente runtime**: API de traducciones de Wix (`translation-content/v1/contents/query`; verificar si la cuenta devuelve lo publicado con `translation-published-content/v3/published-contents/query` y usar la que refleje el copy publicado), paginando de 100 en 100. Se piden solo las locales `es`/`it`; `en` sigue en `src/translations.json` (fuente de claves).
2. **Caché**: KV namespace nuevo `TRANSLATIONS` (binding `TRANSLATIONS` en `wrangler.jsonc`), clave `tr:{locale}:{hash}` con `expirationTtl: 300`. Añadir memo por isolate de 60 s para no leer KV en cada request.
3. **Carga**: `src/shared/i18n/get-translations.ts` con `loadDictionary(locale): Promise<Dictionary>`:
   - memo → KV → API Wix → fallback `.wix/multilingual/translations/{locale}.json` (build).
   - error de API: usar KV stale si existe; si no, JSON; loggear sin romper la página.
4. **API pública**: `getT(locale)` pasa a `async` y devuelve `TFunc`. `hasKey`/`formatPrice`/`formatPairing` quedan sync.
5. **Build**: `src/shared/i18n/build-dictionaries.ts` conserva el import estático de los tres JSON para `getTFromBuild(locale)` (solo lo usa `astro.config.mjs` para el sitemap) y para el fallback empaquetado.
6. **Astro.cache (capa 2, opcional pero pedida)**: `experimental.cache` con el provider de Cloudflare del adapter (`cacheCloudflare()`; confirmar export exacto en la doc de Astro 7.4.10 al ejecutar) y reglas por ruta. Solo cachear HTML session-independent: `/`, `/{locale}/`, `/reserve/`, `/{locale}/reserve/`, legales, `/menu/`, `/{locale}/menu/`, `/gift/`, `/{locale}/gift/` (`maxAge: 300`, `swr: 60`). Excluir `/account/`, `/login/`, `/signup/`, `/confirmation/`, `/api/*` y cualquier respuesta con `Set-Cookie`.

## Pasos

1. **KV y binding**
   - Crear namespace: `pnpm exec wrangler kv namespace create nami-sushi-translations`.
   - Fijar el id en `wrangler.jsonc#kv_namespaces` junto al de `SESSION`; nunca dejar que wrangler lo auto-provisione dos veces (error `10014`).
2. **Loader y tipos**
   - Crear `get-translations.ts` con la cascada memo → KV → API → JSON y merge `en` + locale (es hereda de en; it no).
   - Usar `env` de `cloudflare:workers` como en `src/shared/wix/env.ts`; en dev con `pnpm dev` el binding viene de wrangler.
   - API: paginar con cursor, cortar a las claves de `src/translations.json` para no arrastrar basura; mapear namespace/clave al mismo shape plano actual.
3. **Migrar `getT` a async**
   - `src/shared/i18n/t.ts`: `getT` async; `dictionaries` estático solo para `getTFromBuild` y fallback.
   - 40 call sites: en `.astro`, `const t = await getT(Astro.currentLocale)` en el frontmatter (top-level await soportado).
   - `seo/schema.ts`, `gift/gift-schema.ts`, `reserve/reserve-schema.ts`, `site/menu-mapper.ts`: recibir `t: TFunc` en vez de `locale` y dejar de llamar `getT` internamente; los pages pasan su `t` ya resuelto.
   - `pages/llms.txt.ts`: `const t = await getT()`.
4. **Quitar prerender de lo traducido**
   - `/` (`pages/index.astro`), `/reserve/`, `/legal/`, `/privacy/`, `/cookies/`, `/purchase-terms/`, `/404`: `prerender = false` (o eliminar la export) para que rendericen en request y usen el diccionario fresco.
   - Mantener prerender solo donde no haya copy traducible.
5. **Astro.cache**
   - `astro.config.mjs`: activar `experimental.cache` con el provider de Cloudflare y reglas por ruta (las de arriba).
   - Verificar que el header no dependa de sesión en esas rutas; si alguna pasa `session` al Layout, sacarla de las reglas.
6. **Sitemap**
   - `astro.config.mjs` deja de importar `getT` async: usa `getTFromBuild()` (JSON estático). El sitemap no necesita runtime.
7. **Validación**
   - `pnpm exec astro build && pnpm exec wrangler deploy`.
   - Con `pnpm dev`: cambiar una clave en el dashboard, esperar ≤ 5 min (o borrar la clave KV `tr:es:*` para forzar), recargar y ver el texto nuevo en es; repetir en it.
   - Fallo simulado: key inválida en `.dev.vars` → la página responde 200 con el JSON del build y log de warning.
   - `curl -I` de `/` y `/menu/`: `cf-cache-status`/edad coherentes; `/account/` sin cachear (`Set-Cookie` intacto).
   - E2E: `pnpm test:e2e` verde; typecheck (`pnpm astro check` si está configurado).
8. **Cierre**
   - README: cómo funciona la frescura (≤ 5 min), qué es fallback, cómo invalidar (borrar claves KV) y que el cron ya no existe.
   - ROADMAP: fila 22 → ✅; Riesgo 4 mitigado con esta vía.
   - Liberar el puerto 4321 al terminar (AGENTS.md).

## Criterios de aceptación

- Edición del dashboard visible en es/it en ≤ 5 min sin deploy, con la URL pública real.
- API caída o key inválida: páginas 200 con JSON del build; nunca 500 por traducciones.
- `/menu/` y `/gift/` (SSR) y las páginas antes prerenderizadas sirven copy actualizado.
- `/account/`, login, signup, callback y `/api/*` no se cachean; sesión y cookies intactas.
- Sitemap/canonical/hreflang sin cambios respecto a step-23.
- `pnpm build`, `pnpm deploy` y `pnpm test:e2e` verdes; sin secretos en el repo.

## Notas

- El pull **sobrescribe** los JSON de es/it; no editarlos a mano. `src/translations.json` (en) vive en el repo.
- La API pagina de 100 en 100 y puede tardar; cachear el diccionario completo por locale, no por clave.
- No cachear HTML con `Set-Cookie` ni rutas que reciban `session` en el Layout.
- `it` no hereda de `en`: si falta una clave, cae a `en` en runtime igual que hoy.
- Si Wix publica webhooks de traducciones, se puede invalidar la clave KV desde un endpoint; no hace falta para cumplir los 5 min.
