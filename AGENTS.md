- Usa pnpm
- Node se gestiona con pnpm (no usar nvm/volta/fnm): `pnpm runtime set node 24 -g` (Node 24 LTS, >= 24.22.1 segun engines del package.json). Si "pnpm env use --global" da el error de bin no en PATH, correr antes `pnpm setup` y reabrir la terminal.
- No usamos python, solo nodejs
- Instala paquetes exactos sin caret ^ en el package.json
- Formato (Prettier + prettier-plugin-astro + prettier-plugin-tailwindcss): el editor formatea al guardar (VS Code + extensión Prettier). Escribe código ya formateado y, al terminar una tanda de cambios en varios archivos, ejecuta `pnpm format` sobre el repo (o verifica con `pnpm format:check`) antes de cerrar la tarea/commit. No formatear tras cada micro-edición.
- Todo asset: (imagen, video, etc) adentro de typescript o adentro de jsx de Astro debera ser llamado con baseUrl(...), por ejemplo el css no lo necesita (ejemplo -> background-image: url(/assets/logo.svg))
- No pongas comentarios en el codigo.
- Despues de probar (astro dev, playwright, etc.) cierra siempre el servidor y libera el puerto 4321 (taskkill en el PID del proceso LISTENING). Nunca dejarlo abierto al terminar.
- Cierre obligatorio de TODO lo que abriste al terminar (sin procesos ni ventanas colgadas):
  1. Servidores: matar el PID LISTENING del puerto usado (`netstat -ano | grep ":4321"` -> `taskkill //PID <pid> //F`) y confirmar que el puerto quedo libre.
  2. Pestanas del navegador: cerrar con `close_page` cada pestana abierta con las herramientas DevTools, dejando unicamente `about:blank`.
  3. Ventana del navegador: `close_page` NO cierra la ventana. Matar el Chrome del MCP de DevTools (perfil chrome-devtools-mcp), NUNCA el Chrome personal:
     `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" | Where-Object { \$_.CommandLine -match 'chrome-devtools-mcp' -and \$_.CommandLine -notmatch '--type=' } | ForEach-Object { Stop-Process -Id \$_.ProcessId -Force }"`
     Verificar con `Get-Process chrome | Where-Object { \$_.MainWindowTitle -ne '' }` que no queda ninguna ventana `about:blank`.
- Todo archivo dentro de src/ debe ser kebab-case (minsuclas, sin CamelCase, sin _ ni espacios). Los tests viven en su carpeta aparte (src/tests/), no junto a los componentes.
- Prohibido usar export default, excepto para API routes y los .astro. Usa siempre export nombrado (export const).
- Tailwind v4 moderno: prohibido el valor arbitrario cuando existe clase canonica (regla suggestCanonicalClasses): `aspect-[9/16]` -> `aspect-9/16`, `z-[60]` -> `z-60`, `w-[640px]` -> `w-160`, `max-w-[680px]` -> `max-w-170` (escala spacing x4px). El valor arbitrario solo queda para lo que no tiene forma canonica: `ease-[cubic-bezier(...)]`, `grid-cols-[1fr_1.6fr]`, `min-h-[200svh]`, `w-[min(140vw,960px)]`.
- Las URLs de las paginas seran SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): viven en src/shared/site/nami.ts y no se crean slugs en espanol; la localizacion es solo el prefijo de locale (/es/... /it/...).
- Screaming architecture (inspirado en project-1415, moderno y sin barrels: nada de index.ts re-exportando; los imports son directos por ruta de archivo, con el alias `@/*`). Las carpetas de src/ gritan lo que hace el negocio, no la tecnologia:
  - `src/app/`: chrome de la app (layout.astro, header, footer, logo, language-switcher)
  - `src/features/`: UNA carpeta por capacidad de negocio (home, menu, experiences, press, faq, gift, final-cta); un feature nunca importa de otro feature
  - `src/shared/`: infraestructura transversal (i18n, wix, site: nami/imagenes/base-url, seo, ui: icon/pending/spiral)
  - `src/pages/`: rutas thin que solo componen, sin logica
  - Deprecated: crear carpetas genericas tipo `src/components/`, `src/utils/`, `src/data/`, `src/layouts/`, `src/scripts/`, `src/wix/`, `src/i18n/` (quedan vacias tras el refactor, no reutilizarse)

## Astro (contexto de docs)

- Referencia de documentacion de Astro (Context7, ~10k tokens): https://context7.com/websites/astro_build_en/llms.txt?tokens=10000 . Consultarla con WebFetch cuando necesites confirmar sintaxis/API de Astro en vez de asumir de memoria.

## Auth (Wix) y pruebas

- No intentes automatizar login email/password contra Wix con Playwright ni Chrome DevTools: Wix detecta el navegador como bot y rechaza el token de reCAPTCHA (`invalidCaptchaToken` / `missingCaptchaToken`). No es un bug del codigo ni de la allow-list. Verifica el login real a mano o usa una sesion ya existente.
- El login no pide reCAPTCHA (signup usa reCAPTCHA invisible "Per bot sospetti"), pero la pagina de auth compartida igual carga el script de reCAPTCHA. Un token generado por automatizacion falla aunque el login no lo exija.
- `invalidEmail` en el login de Wix puede significar "identity not found" (el email no existe como miembro), no que el formato sea invalido. Antes de probar credenciales, confirma que el miembro existe.
- Para inspeccionar miembros reales usa la API de Members, no supongas emails de prueba:
  `POST https://www.wixapis.com/members/v1/members/query` con `{ "query": { "filter": { "loginEmail": "..." } }, "fieldsets": ["FULL"] }`.
  Miembros reales de este sitio: `auth-smoke@namicrestaurant.com` (password desconocida) y `d3m0ns300@gmail.com` (creado con Google, nickname "Papi Papi"). `auth-prod-manual@namicrestaurant.com` NO existe; no lo uses.
- No inventes ni borres miembros sin permiso. Si necesitas uno con password conocida, pide al usuario que lo cree a mano.
- La allow-list OAuth ya incluye `localhost:4321` y `nami-sushi.nami-sushi.workers.dev` con redirects a `/api/auth/callback`, `/auth/callback`, `/login/`, `/es/login/` e `/it/login/`. El aviso "Not a valid domain" del dashboard es cosmetico: no elimines el dominio guardado.

## Auth en produccion (step-24, verificado 2026-11-16)

- La allow-list quedó cerrada y verificada leyendo el app con `GET oauth-app/v1/oauth-apps/{id}` autenticado con `client_credentials` y scope `SCOPE.OAUTH_APP.READ` (token de `client_credentials` desde `.dev.vars` con curl; el token del MCP de Wix da 403 para este endpoint). Nunca imprimir el access token ni el secret al hacer esto.
- Contenido final: 10 URIs exactas (5 dev en `http://localhost:4321/...` + 5 produccion en `https://nami-sushi.nami-sushi.workers.dev/...`: `/api/auth/callback`, `/auth/callback`, `/login/`, `/es/login/`, `/it/login/`) y 2 dominios permitidos (`localhost:4321`, `nami-sushi.nami-sushi.workers.dev`). Los URIs de `namicrestaurant.com` fueron retirados. Detalle completo en el `## Resultado` de `step-24-auth-allowlist.md`.
- El arranque OAuth real ya funciona en produccion: `/api/auth/login` -> 302 a la pagina hosted de Wix con `redirectUri=https://nami-sushi.nami-sushi.workers.dev/api/auth/callback` y Wix lo acepta (sin error de redirect URI invalido).
- Verificado contra produccion con curl + Chrome DevTools (no repetir sin necesidad): rutas 200 (/, /menu/, /reserve/, 4 legales, /gift/, /login/, /signup/, sitemap, robots); `/account/` -> 302 a login localizado + returnTo en 3 locales; returnTo a dominio ajeno sanatizado; `/api/auth/callback` sin code -> 302 `/login/?error=oauth_callback`; `/api/auth/session` POST vacio -> 400; `/api/gift/checkout` con Origin ajeno -> 403; canonical/hreflang/og:url en la URL workers.dev; `/api/reserve/setup` completo (Europe/Madrid, reservas enabled, AUTOMATIC, party 1-8, notice 60 MIN, 2 experiencias); `/login/` renderiza form + social + reCAPTCHA enterprise.
- Solo queda el tramo humano del roundtrip (ver la seccion Manual Human).

## Manual Human — lo que yo debo probar

Ultimo tramo del step-24, solo ejecutable por el owner: el login real contra Wix no se
puede automatizar (rechaza tokens reCAPTCHA generados por bots, ver arriba). Todo lo
automatizable ya esta verificado contra produccion (seccion anterior y `## Resultado`
de `.opencode/commands/step-24-auth-allowlist.md`).

En incognito sobre `https://nami-sushi.nami-sushi.workers.dev`:

1. **Login real**: Google con `d3m0ns300@gmail.com` (o un miembro email/password con
   password conocida, creado a mano) -> volver a `/account/` con sesion y nombre en el header. ✅
2. **Logout** desde el header -> vuelta a home + cookies limpias.
3. **Signup** con un email nuevo de prueba -> verificar por el codigo de email -> entrar
   -> borrar el miembro de prueba al terminar.
4. **Password reset**: pedir el enlace desde "Forgot your password?" y comprobar que
   vuelve a la URL de produccion.
5. **Gift checkout** completo desde `/gift/` -> hosted checkout de Wix -> retorno a la
   URL de produccion.

Al cerrar los 5 checks: marca el step-24 como ✅ en `ROADMAP.md` (resumen rapido -> 24/24)
y añade las evidencias al `## Resultado` del step file.

## Server Islands y sesion

- En este proyecto el header usa Server Islands (`src/app/header-account.astro` con `server:defer`) para leer la sesion. En Astro 7 **no** se renderiza un `<astro-island>` para `server:defer`: Astro emite el fallback + un `<script data-island-id>` que hace fetch a `/_server-islands/HeaderAccount` y reemplaza el nodo. Para verificar que el island corre, busca `data-island-id` / `server-island` en el HTML y la peticion en `performance.getEntriesByType('resource')`; no busques `<astro-island>`.
- Los Server Islands funcionan en paginas prerenderizadas (verificado en `/` en su dia): el HTML trae scripts de `HeaderAccount` y el navegador hace fetch a `/_server-islands/HeaderAccount`. Ojo: desde step-22 `/` ya NO es prerender (es SSR con routeRules); el mecanismo del island no cambia.
- No agregues `astro-island { display: contents; }` para `server:defer`: en Astro 7 no existe ese elemento para Server Islands. Solo seria necesario si se agrega una isla de componente de framework cliente.
- `src/shared/wix/env.ts` importa `cloudflare:workers`; con `prerenderEnvironment: 'node'` el dev/SSR falla con "Could not import `cloudflare:workers`" y el prerender del build falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME` (`cloudflare:`). Los unicos valores validos del adapter son `'workerd'` y `'node'`: usar `prerenderEnvironment: 'workerd'` en `astro.config.mjs`.
- El nombre de la cuenta usa `max-w-24 truncate` dentro de `.btn > span`, que aplica `text-box: trim-both cap alphabetic`. Esa combinacion recorta los descendentes (la "p" de "Papi") porque `truncate` agrega `overflow: hidden`. Solucion: desactivar `text-box` solo para el nombre (`.account-name { text-box: normal; }`), no quitar el truncado.

## Traducciones runtime (step-22)

- `getT(locale)` es async. `src/shared/i18n/t.ts` es Node-safe (lo importa `astro.config.mjs` y NO debe importar `cloudflare:workers` ni nada del runtime); el loader runtime (`src/shared/i18n/get-translations.ts`, que si importa `cloudflare:workers`) se inyecta desde `src/middleware.ts` con `setDictionaryLoader()`. El config/sitemap usan `getTFromBuild()` (sincrono, JSON del build).
- API de Wix translation-content (`POST https://www.wixapis.com/translation-content/v1/contents/query`): con paginado por cursor NO se puede enviar `filter` ni `sort` (error 400 `INVALID_CURSOR`: "Sort or filter can not be specified together with cursor"). Tambien da 400 filtrar por `publishStatus` (`INVALID_FILTER: Unknown field in path`). Solucion: query sin filtro, paginar todo (~459 keys x locales, 100/pagina con `pagingMetadata.cursors.next`) y filtrar en cliente (`locale`, `entityId` en el set del translations.json, `publishStatus === "PUBLISHED"`, `fields["static-field"].textValue` no vacio). No filtrar el primer request por entityId: corta la paginacion.
- Cadena de cache del loader: memo en memoria 60 s -> KV `TRANSLATIONS` (clave `tr:all:v{djb2hash del keys}`, TTL 300 s + `tr:all:last` sin TTL como backup caliente) -> fallback JSON del build. Una sola descarga alimenta es+it. Cambios del dashboard se ven en ~5 min. Si Wix cae: KV stale primero, JSON del build despues (transparente, queda warn `[i18n]` en logs).
- KV bindings en `wrangler.jsonc`: `SESSION` (c427c19f...) y `TRANSLATIONS` (ae043c95e089456ba60b69c341bccc0f). En preview local el KV vive en `.wrangler/state/v3/kv/...sqlite` (tabla `_mf_entries`; los valores van por blob_id, no en la columna value).
- Astro.cache es estable en Astro 7: `cache: { provider: cacheCloudflare() }` top-level en `astro.config.mjs`. OJO: `cacheCloudflare` se importa de `@astrojs/cloudflare/cache`, NO del paquete raiz. `routeRules` compila patrones con el `trailingSlash` del config (ignore): un patron `/menu` casa `/menu` y `/menu/`.
- Pages: TODAS las traducidas son SSR (`prerender = false`); solo quedan prerender `/llms.txt` y `/robots.txt`. Con cache intent via routeRules el adapter emite `cache-tag: astro-path:<path>` + `Cloudflare-CDN-Cache-Control: public, max-age=300, stale-while-revalidate=60`; rutas sin regla (account, auth, callback, 404) salen con `no-store` automatico. Como ya no hay 404.html prerenderizado, las rutas desconocidas las sirve el worker (localized 404); los `_redirects` de Cloudflare siguen aplicando antes del worker.
- Los modulos de schema (`src/shared/seo/schema.ts`, `src/features/{gift,reserve}/*-schema.ts`) y `staticMenu(locale, t)` en `src/shared/site/menu-mapper.ts` reciben `t: TFunc` por parametro en vez de llamar getT. No re-introducir `getT` dentro de modulos .ts no-Astro.
- `pnpm wix translation pull` (corre en `pnpm build`) toca `.wix/multilingual/*.json` con churn de line endings CRLF/LF: diffs de 1 linea sin contenido son cosmeticos, ignorarlos.

## Dev / entorno

- El puerto 4321 puede estar ocupado por OTRO proyecto de la maquina (por ejemplo `opencode-grabador-con-guias`). Antes de matar el PID LISTENING revisa su `CommandLine`; nunca cierres un servidor que no abriste.
- Para pruebas de UI sin auth usa otro puerto (`pnpm astro dev --port 4322`) y matalo al terminar. Para callbacks OAuth usa 4321 porque es el unico localhost permitido en la allow-list.
- Los scripts y logs temporales de auth viven en la raiz como `.tmp-step24-*`; borrarlos al cerrar el step. No dejar HTMLs ni tokens de prueba en `public/`.

## Siguientes pasos

- La marca del restaurante es Nami (inventada): las paginas existen; email hola@namicrestaurant.com, Instagram @nami.barcelona.
- No habra dominio propio: la URL publica y canonica es https://nami-sushi.nami-sushi.workers.dev/ (ver step-23/step-24). `namicrestaurant.com` queda solo como marca/email inventados.
