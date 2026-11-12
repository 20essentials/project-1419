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

⏳ pending — existe su step file, sin ejecutar.
