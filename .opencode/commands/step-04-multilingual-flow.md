---
name: "Step 04 — Flujo Wix Multilingual (push/pull)"
goal: "Las traducciones se gestionan desde el Translation Manager del dashboard de Wix; el build las consume via wix translation pull."
---

# Step 04 — Flujo Wix Multilingual (push/pull)

## Precondiciones

- Step-02 (credenciales Wix) y step-03 (translations.json fuente) hechos.
- `@wix/cli` instalado y proyecto autenticado.

## Objetivo

1. Los editores del restaurante crean/editan traducciones en el dashboard (Translation Manager > pestaña Headless).
2. `wix translation pull` las baja a `.wix/multilingual/{locale}.json` y el `t()` del step-03 las consume en build.

## Pasos

1. **CLI y entorno**
   - `pnpm add -DE -E @wix/cli`.
   - Autenticar: `pnpm wix login`, `pnpm wix project list`; enlazar el proyecto con `pnpm wix env pull` (genera/act `.wix/` local).
2. **Habilitar Multilingual en el sitio**
   - Dashboard > Multilingual > añadir idiomas **es** e **it** (inglés = primary/headless source).
3. **push**
   - `pnpm wix translation push` sube las claves de `src/translations.json` al Translation Manager.
   - Verificar en el dashboard que aparecen bajo la pestaña Headless.
4. **Seed de español**
   - Pegar el copy español de referencia (step-03) en el dashboard: manual o usando el machine-translation del panel + revisión.
5. **pull**
   - `pnpm wix translation pull` genera `.wix/multilingual/es.json` (+ `it.json` cuando exista) y `metadata.json`.
   - **Commitear los JSON bajados**: así el build/CPU queda reproducible sin CLI.
   - Integrar el pull en el build: `"build": "pnpm wix translation pull && astro build"` (en CI con token).
6. **Integración con t()**
   - Consumir `.wix/multilingual/*.json` desde `getT()` (imports estáticos por locale, spread de claves planas).
   - Cobertura parcial: fallback a inglés clave a clave.

## Criterios de aceptación

- El dashboard muestra las claves; un cambio de prueba en el dashboard + `pull` + rebuild se refleja en la web.
- `es.json` con el copy inicial completo; `it.json` presente (aunque sea auto-translate por pulir).
- Build verde en un clone limpio tras `pnpm install` (pull incluido).

## Notas

- Documentar en el README el flujo "editor no técnico": dashboard → guardas traducción → (automático en CI) pull+deploy.
- Si `wix translation pull` requiere login interactivo en CI, dejar issue del deploy hook (ROADMAP, Riesgo #4).
