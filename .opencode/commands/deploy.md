---
description: Despliega el sitio a Cloudflare Workers con pnpm deploy (manual, no CI)
---

Despliega la versión actual del repo a producción (`https://nami-sushi.nami-sushi.workers.dev`)
con `pnpm deploy` (= `astro build && wrangler deploy`). Por defecto commit + push a
`origin main` y después deploy: build local y `wrangler deploy` contra el Worker
`nami-sushi`.

## Pre-chequeos (en orden, parar si algo falla)

1. `git status`: si hay cambios sin commit, corre `/commit` (por defecto, sin pedir
   confirmación; si el usuario dijo explícitamente que no commitee, salta este paso).
   Deployar con trabajo sucio a media edición puede publicar código a medias.
2. `git push origin main` tras el commit. Si el push falla (sin red, rechazado), para
   y avisa antes de deployar.
3. `pnpm format:check`: si falla en ficheros que estamos tocando, corre `pnpm format`
   antes de compilar.
4. Puertos: si el 4321 está ocupado por un servidor que abrimos nosotros, matarlo
   antes (`netstat -ano | grep ":4321"` -> `taskkill //PID <pid> //F`, revisando el
   `CommandLine` — nunca cerrar un proceso ajeno).

## Deploy

5. `pnpm deploy`. OJO: usa `astro build` (no `pnpm build`, que corre `wix translation
pull` y exige login del CLI de Wix). Las traducciones se sirven runtime (step-22):
   no hacen falta en el build.
6. Verifica que el deploy se completó (la salida de `wrangler deploy` imprime la
   Version ID y el upload). Si falla con error de KV `10014`, no re-provisionar
   KV: el binding `SESSION` ya está fijado en `wrangler.jsonc`.

## Post-deploy (verificación rápida, todo con curl contra producción)

7. 200 en `/` y en la página del cambio que motivó el deploy (o `/menu/` como genérico).
8. Canonical en `/` sigue siendo `https://nami-sushi.nami-sushi.workers.dev/`.
9. Si el cambio tocó auth: `/api/auth/login` debe seguir devolviendo 302 a la página
   hosted de Wix con `redirectUri` de producción.

## Cierre

10. Reporta en una línea: commit/push hechos (hash), Version ID publicado, rutas
    verificadas y hora del deploy.
11. NO abrir `wrangler tail` ni dejar procesos corriendo. Nada que cerrar al final.
