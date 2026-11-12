---
name: "Step 16 — Fotos de los platos de la carta"
goal: "Los 27 platos de la home/cart tienen su foto real en la ranura ovalada; se elimina el Pending de carta y el placeholder DEV."
---

# Step 16 — Fotos de los platos de la carta

## Precondiciones

- Steps 03–05 (i18n) y step-10 (carta desde restaurants) hechos.

## Objetivo

Resolver el pending `carta.pending` ("Dish photos: photo-01 to photo-27 are not in public/photos. Each dish has its oval slot ready.").

## Pasos

1. **Aportar las fotos**
   - Pedir/recibir al propietario las 27 fotos de los platos (o generar placeholders reales si el propietario decide otra cosa).
   - Colocarlas como assets de Astro (no `public/`) siguiendo el patrón de `src/shared/site/nami.ts` (imports + `baseUrl()`/`Picture`): un asset por plato, kebab-case.
2. **Cablearlas en `src/features/menu/dishes.astro`**
   - Cada `<li>` gana su foto en la ranura ovalada existente (`mask-oval`), con `Picture` (avif/webp), `loading="lazy"` y `alt` vía `t('carta.dishes.<id>.photoAlt')` (nueva clave i18n).
   - Eliminar el bloque `import.meta.env.DEV` del placeholder y el `<Pending>`; borrar `carta.pending` y `carta.photoPlaceholder` de translations.json (push + pull) y la referencia en el checker de enlaces si la hubiera.
3. **Checklist platos ↔ fotos**
   - Los ids de `platos` en `src/shared/site/nami.ts` son la fuente: 27 claves, ninguna foto sin plato ni plato sin foto. Documentar el mapping en el Resultado del step.
4. **Smoke**
   - `pnpm build && pnpm preview`: home y `/carta/` en en/es/it 200, fotos visibles, sin Pending.
   - Verificar peso de página (LCP razonable: las 27 fotos son lazy y solo home muestra la lista).

## Criterios de aceptación

- 0 pendings de fotos en el render; los 27 platos muestran su foto ovalada.
- Claves i18n nuevas en los 3 idiomas (push + seed es/it si toca).
- Sin comentarios; assets kebab-case; puerto 4321 liberado al terminar.

## Notas

- Si alguna foto no llega, queda `parket` explícito en el Resultado (no volver a crear pending).
- Cerrar servidor y liberar puerto al terminar (AGENTS.md).

## Resultado

✅ done — ejecutado el 2026-11-12.

- **Decisión del propietario**: sin fotos reales disponibles → placeholders reales (fotografías libres de Wikimedia Commons), y alcance **los 5 platos de la home** (`nami.ts`), no los 27 del step original (la cifra 27 quedó obsoleta tras el step-10: la carta vive en Wix Restaurants).
- **El propietario pidió "varias imágenes coherentes por plato"** → 3 fotos por plato (15 en total), descargadas con `Special:FilePath?width=1000` (mejor a retención con `sleep 12` entre descargas por rate-limit 429; una URL 404 se resolvió con la API de búsqueda de Commons — el nombre real era `Assorted Nigiri -2 (9865148706).jpg`).
- **Mapping plato ↔ fotos** (`src/assets/photos/`, kebab-case, JPG origen; Astro genera avif/webp/jpg con srcset 160/240/320/480w):
  - `bluefin-carpaccio`: 01 Herb seared tuna carpaccio (CC BY-SA 2.0, Alpha) · 02 Tartare di tonno rosso · 03 Le Bernardin Tuna over Foie Gras
  - `oyster-ponzu`: 01 "Fine de Claire" raw oysters · 02 Oysters served on ice, with lemon and parsley · 03 Oyster on ice
  - `nigiri-selection`: 01 Assorted Nigiri -1 (9865131454) · 02 Assorted Nigiri -2 (9865148706) · 03 Flickr - cyclonebill - Sushi (1)
  - `wagyu-picanha`: 01 Griddled wagyu beef · 02 Sliced Matsusaka wagyu beef · 03 Wagyū on plate 2
  - `lucuma-gelato`: 01 Bowl ~ Ice cream · 02 Pistachio & strawberry happiness · 03 Gelato all'Amarena
- **Cambio de modelo**: `platos` pasa de `string[]` a `{ id, fotos: [ImageMetadata, ImageMetadata, ImageMetadata] }[]` en `nami.ts` (imports con rutas relativas, igual que `photos`/`paseo`); actualizados los 3 consumidores: `menu-mapper.ts` (`plato.id`), `schema.ts` (`plato.id`) y `dishes.astro`.
- **Render** (`dishes.astro`): cada `<li>` muestra un trío de óvalos `mask-oval` con solape (`-space-x-2`) y stagger (`translate-y-2` laterales); óvalo central (h-24 w-18) con `Picture` `formats={['avif','webp']}` + `loading="lazy"` y `alt` real vía `t('carta.dishes.<id>.photoAlt')`; los dos laterales (h-20 w-16) decorativos con `alt=""` + `aria-hidden`. Eliminados el `<Pending>` y el bloque `import.meta.env.DEV`.
- **i18n**: −2 claves (`carta.pending`, `carta.photoPlaceholder`) y +5 `carta.dishes.<id>.photoAlt` en `translations.json`; `translations:push` OK → seed es/it vía REST `translation-content/v1/bulk/contents/create` (10/10; field `static-field`, schemaId `e2aa6aa7-…`, igual que steps previos) → `pull` roundtrip limpio (las claves borradas desaparecen de `.wix/multilingual`, las 5 nuevas presentes en es/it).
- **Gotchas**: la GET de schema por id da 404 y la query de schemas devuelve vacío con API key — para descubrir el field key se usó `contents/search` de un entityId existente (`carta.title` → field `static-field`).
- **Smoke** (`pnpm build && pnpm preview`): home y `/carta/` 200 en en/es/it; 15 `<img>` de platos en el home; 0 ocurrencias de pending/placeholder en el HTML; alt y `aria-hidden` verificados; screenshot de `#carta` correcto (tríos visibles y coherentes). `tsc` limpio en los archivos tocados (errores preexistentes fuera de alcance). Puerto 4321 liberado y navegador del MCP cerrado.
- **Nota de reemplazo**: cuando el propietario tenga fotos reales, basta sobreescribir los JPG de `src/assets/photos/<slug>-NN.avif` manteniendo los nombres.

## Resultado (extensión 2026-11-13 — 9 fotos × 16 platos, AVIF, galería en /carta/)

✅ done — el propietario pidió **≥9 imágenes por plato para TODOS los platos** (no solo los 5 de la home) y **convertir todo a AVIF**.

- **Recuento real de la carta Wix**: 16 platos (Starters 4 · Nigiris & Sashimi 4 · Rolls 3 · Grilled & Warm 2 · Desserts 3) — la cifra "27" del step original es obsoleta.
- **144 fotos** (`src/assets/photos/<slug>-01..09.avif`, kebab-case): 15 reutilizadas de la tanda anterior + 129 nuevas de Wikimedia Commons vía API de búsqueda (`generator=search&gsrnamespace=6&prop=imageinfo&iiurlwidth=1000`, User-Agent propio, `maxlag=5`), seleccionadas a mano por coherencia de plato y validadas como JPEG antes de convertir.
- **Conversión AVIF**: sharp `quality 60, effort 4` sobre los 144 JPG → `.avif` (~60% menos) y borrado del JPG original. Los 7 webp de ambiente (`0-entrada..6-vinos`) se quedan como estaban.
- **Código**:
  - Nuevo `src/shared/site/platos-fotos.ts`: `import.meta.glob('../../assets/photos/*.avif', { eager: true })` → mapa `slug → ImageMetadata[]` ordenado por índice; `platoFotos(slug)` y `fotosDeCartaItem(title)` con tabla `slugsPorNombre` (nombre de ítem de Wix → slug; los 5 signature comparten slug con su ítem de carta).
  - `nami.ts`: los 15 imports ahora apuntan a `.avif` (el trío de la home sigue usando fotos 01–03 de su slug).
  - `menu-mapper.ts`: `CartaItem` gana `fotos: ImageMetadata[]` (Wix: `fotosDeCartaItem(name)`; estático: `platoFotos(plato.id)`).
  - `carta.astro`: cada `<li>` de la carta muestra una tira de 9 óvalos `mask-oval` h-12 w-10 solapados (índices impares con `translate-y-1.5`), `Picture formats={['avif','webp']}` widths 64/128 `sizes="40px"` `loading="lazy"`, decorativos (`alt=""` + `aria-hidden="true"`).
- **Gotcha clave**: con `import.meta.glob(..., { eager: true })` cada valor es el MÓDULO, no el export: hay que usar `modulo.default`; usar el módulo directo provoca `UnsupportedImageFormat: format undefined from undefined` y mata el worker (workerd, también en dev). Segundo gotcha: dev/preview con adapter cloudflare ocupa 4321; si otro servidor sigue vivo, dev arranca en 4322.
- **Smoke**: `pnpm build` OK (186 imágenes optimizadas); `preview` (workerd de producción) → `/carta/` 144 imgs en en/es/it, home 200 sin crash, endpoint `/_image` 200; screenshots de `/carta/` correctos (tirás de 9 óvalos por plato). Puerto 4321 liberado, pestañas cerradas y Chrome del MCP matado (el Chrome personal quedó intacto).
- **Nota de reemplazo**: seguir manteniendo el patrón `<slug>-NN.avif`; si se añade/reemplaza una foto basta sobreescribir el archivo con ese nombre (el glob la recoge solo).
