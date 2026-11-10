- Usa pnpm
- No usamos python, solo nodejs
- Instala paquetes exactos sin caret ^ en el package.json
- Todo asset: (imagen, video, etc) adentro de typescript o adentro de jsx de Astro debera ser llamado con baseUrl(...), por ejemplo el css no lo necesita (ejemplo -> background-image: url(/assets/logo.svg))
- No pongas comentarios en el codigo.
- Despues de probar (astro dev, playwright, etc.) cierra siempre el servidor y libera el puerto 4321 (taskkill en el PID del proceso LISTENING). Nunca dejarlo abierto al terminar.
- Todo archivo dentro de src/ debe ser kebab-case (minsuclas, sin CamelCase, sin _ ni espacios). Los tests viven en su carpeta aparte (src/tests/), no junto a los componentes.
- Prohibido usar export default, excepto para API routes y los .astro. Usa siempre export nombrado (export const).
- Screaming architecture (inspirado en project-1415, moderno y sin barrels: nada de index.ts re-exportando; los imports son directos por ruta de archivo, con el alias `@/*`). Las carpetas de src/ gritan lo que hace el negocio, no la tecnologia:
  - `src/app/`: chrome de la app (layout.astro, header, footer, logo, language-switcher)
  - `src/features/`: UNA carpeta por capacidad de negocio (home, menu, experiences, press, faq, gift, final-cta); un feature nunca importa de otro feature
  - `src/shared/`: infraestructura transversal (i18n, wix, site: nami/imagenes/base-url, seo, ui: icon/pending/spiral)
  - `src/pages/`: rutas thin que solo componen, sin logica
  - Deprecated: crear carpetas genericas tipo `src/components/`, `src/utils/`, `src/data/`, `src/layouts/`, `src/scripts/`, `src/wix/`, `src/i18n/` (quedan vacias tras el refactor, no reutilizarse)

## Siguientes pasos
- La marca del restaurante es Nami (inventada): hay que construir las paginas que apuntan con URLs relativas en src/shared/site/nami.ts y aun no existen: /reservar/, /regalar/, /carta/, /legal/, /privacidad/, /cookies/, /terminos-compra/.
- El dominio inventado es namicrestaurant.com (email hola@namicrestaurant.com, Instagram @nami.barcelona): registrar dominio y cuentas cuando exista el proyecto real.
