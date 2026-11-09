# Nami (1419-scroll)

Restaurante Nikkei en Barcelona — Astro + Wix Headless, deploy en Cloudflare Workers.

## Setup

```bash
pnpm install
```

Requiere Node >= 24.22 (lo exige la CLI de Wix). Usa `.nvmrc` (nvm use).

Enlaza el proyecto con Wix (`wix.config.json`, ya commiteado) y autentica: `pnpm wix login`.

## Idiomas y traducciones

Flujo push/pull con el Translation Manager del dashboard de Wix (`Wix Multilingual`):

- Inglés es el idioma primario y la fuente de las claves: `src/translations.json`.
- Los editores traducen en el dashboard: **Website Content > Multilingual > Edit Translations > pestaña Headless** y pulsan *Save and Publish*.
- `pnpm translations:pull` baja los JSON a `.wix/multilingual/translations/{es,it}.json`; `getT()` (src/i18n/t.ts) los consume en build con fallback a inglés clave a clave.
- Los JSON de `.wix/multilingual/translations/` están commiteados, así el build es reproducible aunque no haya sesión de CLI. `pnpm build` intenta `wix translation pull` antes de `astro build`; en CI usar `wix login --api-key`.
- Para subir claves nuevas al dashboard: `pnpm translations:push` (borra las no usadas, cuidado).
