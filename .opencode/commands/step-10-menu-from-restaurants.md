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
