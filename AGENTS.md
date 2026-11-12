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
- Las URLs de las paginas seran SIEMPRE en ingles (/reserve/, /gift/, /menu/, /privacy/, /cookies/, /purchase-terms/, /legal/): viven en src/shared/site/nami.ts y no se crean slugs en espanol; la localizacion es solo el prefijo de locale (/es/... /it/...).
- Screaming architecture (inspirado en project-1415, moderno y sin barrels: nada de index.ts re-exportando; los imports son directos por ruta de archivo, con el alias `@/*`). Las carpetas de src/ gritan lo que hace el negocio, no la tecnologia:
  - `src/app/`: chrome de la app (layout.astro, header, footer, logo, language-switcher)
  - `src/features/`: UNA carpeta por capacidad de negocio (home, menu, experiences, press, faq, gift, final-cta); un feature nunca importa de otro feature
  - `src/shared/`: infraestructura transversal (i18n, wix, site: nami/imagenes/base-url, seo, ui: icon/pending/spiral)
  - `src/pages/`: rutas thin que solo componen, sin logica
  - Deprecated: crear carpetas genericas tipo `src/components/`, `src/utils/`, `src/data/`, `src/layouts/`, `src/scripts/`, `src/wix/`, `src/i18n/` (quedan vacias tras el refactor, no reutilizarse)

## Siguientes pasos
- La marca del restaurante es Nami (inventada): las paginas existen; email hola@namicrestaurant.com, Instagram @nami.barcelona.
- El dominio inventado es namicrestaurant.com: registrar dominio y cuentas cuando exista el proyecto real (ver step-100).
