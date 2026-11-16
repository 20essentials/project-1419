- Usa pnpm
- Node se gestiona con pnpm (no usar nvm/volta/fnm): `pnpm runtime set node 24 -g` (Node 24 LTS, >= 24.22.1 segun engines del package.json). Si "pnpm env use --global" da el error de bin no en PATH, correr antes `pnpm setup` y reabrir la terminal.
- No usamos python, solo nodejs
- Instala paquetes exactos sin caret ^ en el package.json
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

## Auth (Wix) y pruebas
- No intentes automatizar login email/password contra Wix con Playwright ni Chrome DevTools: Wix detecta el navegador como bot y rechaza el token de reCAPTCHA (`invalidCaptchaToken` / `missingCaptchaToken`). No es un bug del codigo ni de la allow-list. Verifica el login real a mano o usa una sesion ya existente.
- El login no pide reCAPTCHA (signup usa reCAPTCHA invisible "Per bot sospetti"), pero la pagina de auth compartida igual carga el script de reCAPTCHA. Un token generado por automatizacion falla aunque el login no lo exija.
- `invalidEmail` en el login de Wix puede significar "identity not found" (el email no existe como miembro), no que el formato sea invalido. Antes de probar credenciales, confirma que el miembro existe.
- Para inspeccionar miembros reales usa la API de Members, no supongas emails de prueba:
  `POST https://www.wixapis.com/members/v1/members/query` con `{ "query": { "filter": { "loginEmail": "..." } }, "fieldsets": ["FULL"] }`.
  Miembros reales de este sitio: `auth-smoke@namicrestaurant.com` (password desconocida) y `d3m0ns300@gmail.com` (creado con Google, nickname "Papi Papi"). `auth-prod-manual@namicrestaurant.com` NO existe; no lo uses.
- No inventes ni borres miembros sin permiso. Si necesitas uno con password conocida, pide al usuario que lo cree a mano.
- La allow-list OAuth ya incluye `localhost:4321` y `nami-sushi.nami-sushi.workers.dev` con redirects a `/api/auth/callback`, `/auth/callback`, `/login/`, `/es/login/` e `/it/login/`. El aviso "Not a valid domain" del dashboard es cosmetico: no elimines el dominio guardado.

## Server Islands y sesion
- En este proyecto el header usa Server Islands (`src/app/header-account.astro` con `server:defer`) para leer la sesion. En Astro 7 **no** se renderiza un `<astro-island>` para `server:defer`: Astro emite el fallback + un `<script data-island-id>` que hace fetch a `/_server-islands/HeaderAccount` y reemplaza el nodo. Para verificar que el island corre, busca `data-island-id` / `server-island` en el HTML y la peticion en `performance.getEntriesByType('resource')`; no busques `<astro-island>`.
- Los Server Islands **si funcionan en paginas con `export const prerender = true`** (verificado en `/`): el HTML trae 2 scripts de `HeaderAccount` y el navegador hace 2 fetch a `/_server-islands/HeaderAccount` (~430 ms en dev). No quites el prerender solo por esto.
- No agregues `astro-island { display: contents; }` para `server:defer`: en Astro 7 no existe ese elemento para Server Islands. Solo seria necesario si se agrega una isla de componente de framework cliente.
- `src/shared/wix/env.ts` importa `cloudflare:workers`; con `prerenderEnvironment: 'node'` el dev/SSR falla con "Could not import `cloudflare:workers`" y el prerender del build falla con `ERR_UNSUPPORTED_ESM_URL_SCHEME` (`cloudflare:`). Los unicos valores validos del adapter son `'workerd'` y `'node'`: usar `prerenderEnvironment: 'workerd'` en `astro.config.mjs`.
- El nombre de la cuenta usa `max-w-24 truncate` dentro de `.btn > span`, que aplica `text-box: trim-both cap alphabetic`. Esa combinacion recorta los descendentes (la "p" de "Papi") porque `truncate` agrega `overflow: hidden`. Solucion: desactivar `text-box` solo para el nombre (`.account-name { text-box: normal; }`), no quitar el truncado.

## Dev / entorno
- El puerto 4321 puede estar ocupado por OTRO proyecto de la maquina (por ejemplo `opencode-grabador-con-guias`). Antes de matar el PID LISTENING revisa su `CommandLine`; nunca cierres un servidor que no abriste.
- Para pruebas de UI sin auth usa otro puerto (`pnpm astro dev --port 4322`) y matalo al terminar. Para callbacks OAuth usa 4321 porque es el unico localhost permitido en la allow-list.
- Los scripts y logs temporales de auth viven en la raiz como `.tmp-step24-*`; borrarlos al cerrar el step. No dejar HTMLs ni tokens de prueba en `public/`.

## Siguientes pasos
- La marca del restaurante es Nami (inventada): las paginas existen; email hola@namicrestaurant.com, Instagram @nami.barcelona.
- No habra dominio propio: la URL publica y canonica es https://nami-sushi.nami-sushi.workers.dev/ (ver step-23/step-24). `namicrestaurant.com` queda solo como marca/email inventados.
