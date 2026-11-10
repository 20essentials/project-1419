---
name: "Step 10 — Carta desde Wix Restaurants"
goal: "/carta/ consume el menú real del dashboard (menus/sections/items) con ApiKey SSR + caché, fallback a datos estáticos."
---

# Step 10 — Carta desde Wix Restaurants

## Precondiciones

- Step-02 (API key con scope de lectura restaurants/menus) y step-05 (locales listos).
- Receta project-1415: `how-to-code-restaurant-orders.md` (parte de menús) y su `src/features/dining/menu.ts` de referencia (listMenus/listSections/listItems + ensamblado por order).

## Objetivo

La carta se edita desde el dashboard de Wix (el usuario cambia platos sin deploy) y `/carta/` la pinta en SSR con cache.

## Pasos

1. **Menú en el dashboard**
   - Crear/definir el menú de Nami en el app Wix Restaurants: secciones (Entrantes, Nigiris, Rolls, Postres...), items con nombre/descripción/precio/notas.
   - En inglés como fuente; los `alt`/descripciones por traducir en el Translation Manager si se quiere (o austeramente, en inglés para la demo inicial).
2. **Feature server**
   - `src/shared/wix/menu-client.ts` con `menus.listMenus` / `sections.listSections` / `items.listItems` (admin ApiKey) + ensamblado en orden de `sectionIds`/`itemIds` (igual que project-1415).
   - Parser en `src/shared/site/menu-mapper.ts` → estructura propia estable (`{ sections: [{ id, title, items: [{ id, title, description, price }] }] }`).
3. **Página /carta/**
   - SSR: llama al parser y renderiza la carta estilo Nami (desktop dos columnas / mobile lista), precios con `Intl.NumberFormat` en EUR con el locale de la página.
   - Traducción de títulos de secciones: si Wix devuelve copy fijo, claves `carta.section.*` con `t()`; items quedan como-Wix (inglés) + fallback.
4. **Caché y fallback**
   - Cache simple de la respuesta por 10–15 min (`caches.default` de Cloudflare u objeto en module scope).
   - Si el menú está vacío o la API falla: fallback a los datos actuales de `nami.ts` (`platos`) + flag `source: 'static'` (sin rótulo visible noise).
   - Nunca romper el render: try/catch y render estático en error.
5. **Meta/SEO**
   - Title/description por locale (`seo.carta.*`) y hreflang heredados del step-05.

## Criterios de aceptación

- Con menú creado en dashboard, `/carta/` (y `/es/carta/`, `/it/carta/`) muestra secciones/items reales con formatte de precio.
- Editar un plato en el dashboard → visible tras el TTL de cache (o tras dump/clear local para probar).
- Simulación de error de API → la página renderiza la carta estática de nami.ts sin romper build.
- Sin comentarios; archivos kebab-case; pnpm exact.

## Notas

- Si el app Restaurants en el proyecto exige otra capa (setup inline-recipes `setup-restaurants.md`), seguirla al letra y anotar la corrección en ROADMAP.
- Liberar puertos al terminar (AGENTS.md).

## Resultado

✅ Ejecutado (2026-11-10). `/carta/` renderiza el menú real de Wix (5 secciones × 16 items EUR), es/it 200 por fallback rewrite, caché 600s + fallback estático.

**Menú en dashboard (Wix Restaurants)**

- El app **Wix Restaurants Menus** (`appDefId b278a256-2757-4f19-9313-c05c783bec92`) no estaba instalado (404 en endpoints de menus) → instalado vía Apps Installer API (`POST /apps-installer-service/v1/app-instance/install`, `installType: INSTALL_TYPE_SITE`).
- Menú "Nami" sembrado por REST (no dashboard): `menus-menu/v1` + `menus-section/v1` + `menus-item/v1`. **Gotchas de REST** (REST devuelve `id` camelCase; el SDK interno usa `_id`): query con `POST .../query` + `{ cursorPaging: { limit: 100 } }`; bulk create = `POST .../bulk/sections/create` / `.../bulk/items/create` con `returnEntity: true` → las entidades llegan en `results[].entity`; PATCH de hijos necesita `{ section: { id, revision, itemIds } }` / `{ menu: { id, revision, sectionIds } }` — el **orden de display vive en los arrays de ids del padre**. Contenido final: menu `58e4bc29-…` (rev 3), secciones [Grilled & Warm, Rolls, Nigiris & Sashimi, Desserts, Starters], 16 items con precio EUR (Wagyu picanha 46, Nigiri selection 32, Lucuma gelato 12…). Demo menu/sections/items borrados. 404 transitorios con body vacío en queries → reintentar (no es estado real).
- Títulos/labels del menú quedan como-Wix (inglés); no se usan claves `carta.section.*` (el User Menu de Wix es la fuente única).

**Feature server**

- `src/shared/wix/menu-client.ts`: `getWixMenu()` con admin ApiKey (`menus.listMenus({onlyVisible:true})`, `menuSections.listSections`, `menuItems.listItems`), elige el menú llamado "Nami", devuelve `{ menu, sections, items }` o `null` (console.error + null, nunca lanza).
- `src/shared/site/menu-mapper.ts`: tipos `CartaItem/CartaSection/CartaMenu/CartaSource`; `mapWixMenu()` ensambla por `sectionIds`/`itemIds`, filtra invisibles, `parsePrice` → number|null; `staticCarta(locale)` fallback desde `platos` (`nami.ts`, una sección con título `t('carta.eyebrow')`, price null); `formatEuPrice(price, locale)` con `Intl.NumberFormat` (`en`/`es-ES`/`it-IT`, EUR, mínimo 0 decimales para enteros).

**Página**

- `src/features/menu/carta-data.ts`: `getCartaData(locale)` — caché de módulo del resultado Wix TTL 600_000 ms (compartida entre locales), fallback `staticCarta` en error/menú vacío; `invalidateCartaCache()` expuesto.
- `src/features/menu/carta.astro`: eyebrow/título/pageIntro, secciones en `lg:columns-2` con `break-inside-avoid` (2 col desktop / lista móvil), items con precio en teja font-display, nota inferior + CTA a `links.reservar`.
- `src/pages/carta/index.astro`: thin SSR (no prerender). Ruta dev `src/pages/api/dev/carta-refresh.ts` (GET) invalida la caché.

**i18n**

- 4 claves nuevas en `src/translations.json` (242→246): `seo.carta.{title,description}`, `carta.pageIntro`, `carta.pageNote` — push CLI + seed es/it por REST (`translation-content/v1/bulk/contents/create` con el key como entityId y `published: true`, fixes vía `bulk/contents/update-by-key`, luego `wix translation pull --json`).

**Fix necesaria de plataforma**

- `/es/carta/` y `/it/carta/` respondían **302 sin Location** (con body es/it completo): bug conocido de Astro para páginas on-demand con i18n fallback (`fallbackType: 'rewrite'`), arreglado en astro 7.4.10 (PR #18474). `pnpm add -E astro@7.4.10` (7.3.6→7.4.10) y todas las locales responden 200. Para steps futuros: rutas SSR + fallback rewrite exigen astro >= 7.4.10.

**Smoke (astro preview workerd, [::1]:4321)**

- `/carta/` `/es/carta/` `/it/carta/` → 200 con items Wix (Wagyu, "Carta actualizada por el restaurante"), `lang`/`aria-current`/hreflang correctos por locale; `/es/reserve/` 200; `/it/no-existe/` 404; `/api/reserve/setup` 200; `/api/dev/carta-refresh` (GET) → `{"ok":true,"cache":"cleared"}`. Preview matado y puerto 4321 liberado.

Siguiente: `step-11-legal-static-pages`.
