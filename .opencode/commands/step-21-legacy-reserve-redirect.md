---
name: "Step 21 — Redirect legacy /reservar/ (301)"
goal: "Redirigir 301 el slug histórico en español /reservar/ (y sus versiones es/it) a /reserve/ localizado, conservando query string, sin tocar las anclas #reservar de la home."
---

# Step 21 — Redirect legacy /reservar/

Paso **deferido (parket)**: se ejecuta solo cuando el propietario lo pida. No bloquea nada; conviene hacerlo junto con (o después de) el deploy real del step-100 para que el 301 viva en la URL pública.

## Precondiciones

- Sitio construible (`pnpm build` verde) y, preferiblemente, deploy del step-100 hecho (el 301 se valida con `curl` sobre la URL real).
- Owner confirma que `/reservar/` fue el slug histórico público (enlaces en redes/impresos/email) y que quiere 301 permanente.
- Sin middleware en el proyecto todavía (`src/middleware.ts` no existe): este step lo crea.

## Objetivo

`GET /reservar/` → `301 /reserve/`; `GET /es/reservar/` → `301 /es/reserve/`; `GET /it/reservar/` → `301 /it/reserve/`. Query string preservado (`?experience=<id>`, `utm_*`, etc.). Los anchors internos `id="reservar"` de la home (`src/features/final-cta/final-cta.astro:10`, `src/features/reserve/wizard.astro:71`) **no se tocan**: no son rutas.

## Pasos

1. **Inventario del slug histórico**
   - Confirmar variantes reales: `/reservar/`, `/reservar` (sin slash), `/es/reservar/`, `/it/reservar/`, y query string usada en campañas.
   - `grep -rn "reservar" src --include=*.ts --include=*.astro` para descartar enlaces internos vivos (los `links.reservar` ya apuntan a `/reserve/` desde step-05).
2. **Implementación**
   - Crear `src/middleware.ts` con `defineMiddleware`:
     - matchear solo `^/(?:es|it)?/reservar/?$` sobre `context.url.pathname`;
     - derivar locale de `pathname` con `localeFromPathname` (`src/shared/i18n/routing.ts`) y `localizedPathname('/reserve/', locale)`;
     - devolver `context.redirect(target + context.url.search, 301)`.
   - No redirigir nada más: rutas desconocidas siguen dando 404.
   - Alternativa a comparar solo si el middleware da problemas con prerender: `redirects` en `astro.config.mjs`. **Ojo:** con i18n y `prefixDefaultLocale: false` los `redirects` no se localizan solos; si se usa esa vía hay que declarar las tres entradas (`/reservar`, `/es/reservar`, `/it/reservar`). Preferir middleware (una sola regla, menos config duplicada).
3. **Tests (Playwright)**
   - Añadir `src/tests/redirects.spec.ts` usando `request.get(ruta, { maxRedirects: 0 })`:
     - `/reservar/` → `301`, `location` = `/reserve/`;
     - `/reservar` (sin slash) → `301`, `location` = `/reserve/`;
     - `/es/reservar/` → `301`, `location` = `/es/reserve/`;
     - `/it/reservar/` → `301`, `location` = `/it/reserve/`;
     - `/reservar/?experience=<id>&utm_source=x` → `location` conserva `?experience=<id>&utm_source=x`;
     - control negativo: `/reservas/` y `/reservar-x/` → 404.
   - Verificar que el target responde 200 sin cadena de redirecciones (`curl -sI`).
4. **Validación post-deploy (si step-100 ya está live)**
   - `curl -sI https://namicrestaurant.com/reservar/` → `301` + `location: https://namicrestaurant.com/reserve/`.
   - Repetir en `/es/` y `/it/`; comprobar que el `location` conserva query string.
   - Confirmar que no hay redirección en cadena (un solo salto) y que el destino responde 200.
5. **Cierre**
   - `pnpm exec tsc --noEmit` sin errores nuevos y `pnpm exec playwright test redirects reserve-flow` verde.
   - Liberar el puerto 4321 (PID LISTENING → `taskkill`) si se levantó servidor.

## Criterios de aceptación

- `301` (no `302`) en las tres locales, con y sin slash, conservando query string.
- Una sola redirección hasta `/reserve/`; el destino responde 200.
- Anclas `#reservar` intactas; ninguna otra ruta cambia de comportamiento (404 sigue siendo 404).
- Tests nuevos verdes + suite de reservas sin regresiones; typecheck sin errores nuevos.
- ROADMAP actualizado (fila 21 → ✅) con nota de una línea.

## Notas

- Convención del proyecto: las rutas son SIEMPRE en inglés; `/reservar/` es legado, no se reintroduce (AGENTS.md).
- No es el lugar para otros slugs viejos (`/carta/`, `/regalar/`): si el owner los quiere, hacer un step aparte con su propio inventario/301 (podrían requerir coincidencia exacta con Search Console).
- El middleware corre en runtime; `/reservar/` no es una página prerenderizada, así que el adapter de Cloudflare lo resuelve y el middleware aplica. Validar también en `pnpm preview`.
- No añadir comentarios al código (AGENTS.md).
