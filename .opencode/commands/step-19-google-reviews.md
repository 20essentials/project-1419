---
name: "Step 19 — Reseñas de Google en prensa"
goal: "Rating y número de reseñas verificados en la sección de prensa (o en su lugar copy avalado por el propietario); Pending eliminado."
---

# Step 19 — Reseñas de Google en prensa

## Precondiciones

- Steps 03–05 (i18n) hechos.

## Objetivo

Resolver el pending `press.pending`: "Google reviews: they are not on their website; verified rating and number of reviews are missing."

## Pasos

1. **Obtener los datos verificados (bloqueante)**
   - Pedir al propietario el rating y el nº de reseñas de Google Business de Nami (el restaurante inventado aún no existe: decidir si se muestran datos placeholder aprobados o se oculta la sección hasta tener el local real).
   - Opcional: conectar Google Business Profile API / Places API para leer rating + user_ratings_total en SSR con caché (mismo patrón que `src/shared/wix/menu-client.ts`).
2. **Implementar en `src/features/press/press.astro`**
   - Mostrar el bloque de reseñas: rating (estrellas), nº de reseñas y enlace al perfil de Google; datos en `src/shared/site/nami.ts` (`googleReviews = { rating, count, url }`).
   - Si se elige API: usar las claves existentes vía Cloudflare secrets (`wrangler secret`), caché 600s, fallback estático y sin 500 si Google falla.
3. **Cerrar el pending**
   - Eliminar el `<Pending>` y las claves `press.pending` (push + pull).
   - SEO: si se muestra rating, valorar JSON-LD `AggregateRating` (solo con datos reales).
4. **Smoke**
   - Home en en/es/it 200 con el bloque visible y datos correctos; sin Pending.

## Criterios de aceptación

- 0 pendings de prensa en el render; rating/reseñas mostrados o decisión de ocultarlos documentada.
- Ningún dato inventado sin aval del propietario; puerto 4321 liberado.

## Notas

- Las URLs de las paginas son SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): AGENTS.md. Los step docs ya ejecutados (01–16) citan slugs viejos en espanol a proposito: no reescribirlos al ejecutar este step.
- Si no hay datos reales ni decisión, dejar `parket` en el Resultado.
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

✅ done (2026-11-14)

- **Decisión del propietario (preguntada antes de codear)**: placeholder avalado — rating `4.8`, `320` reseñas y enlace al perfil de Google Maps, en `googleReviews = { rating, count, url }` en `src/shared/site/nami.ts`. JSON-LD `AggregateRating` **no** añadido (datos placeholder, no reales; añadirlo solo cuando exista el perfil real).
- **Implementación**: bloque de reseñas en `src/features/press/press.astro` tras la cita de prensa (5 estrellas phosphor fill — 4 llenas + media — en `text-teja`, rating localizado `4.8` en / `4,8` en es/it vía `toLocaleString`, count `press.reviews.count` y link `See reviews on Google` a `links.maps`); `<Pending>` de prensa eliminado. `icon.astro` + `star`/`starHalf` (fill).
- **i18n**: `−1` clave (`press.pending`) y `+3` (`press.reviews.stars` con `{rating}`/`{count}`, `press.reviews.count`, `press.reviews.read`); `translations:push` OK → seed es/it vía REST `translation-content/v1/bulk/contents/create` (6/6, field `static-field`, schemaId `e2aa6aa7-…`; primer intento 400 por usar `staticField` a nivel raíz — el body correcto lleva array `fields` con `{ textValue, updatedBy, published }`) → `translations:pull` roundtrip limpio (3 claves nuevas en es/it, 0 restos de `press.pending` en las 3 locales).
- **Fix colateral**: `tsconfig.json` paths `"@/*": ["./src/*"]` (TS5090: paths no relativo sin `baseUrl`, doc `compiler-options-baseurl-deprecate-solution`).
- **Smoke**: `pnpm build` OK; `/`, `/es/`, `/it/` → 200 con el bloque visible y datos localizados correctos (captura verificada en browser); 0 ocurrencias de "pending" en el render de las 3 locales. Puerto 4321 liberado (PID 6544 terminado).
- **Nota typecheck**: `tsc --noEmit` pasa limpio en los ficheros del step; quedan 7 errores preexistentes fuera de alcance (`astro.config.mjs`, `motion.ts`, `create-reservation.ts`, `menu-mapper.ts`, `env.ts`).
