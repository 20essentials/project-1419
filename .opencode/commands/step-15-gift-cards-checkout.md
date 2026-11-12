---
name: "Step 15 — /regalar/ con compra real (checkout)"
goal: "Compra de gift cards con @wix/ecom + checkout alojado en Wix, retorno a /account/ y orden visible."
---

# Step 15 — /regalar/ con compra real (checkout)

## Precondiciones

- Steps 12–14 (sesión + account) hechos.
- App ecommerce/gift vouchers activo en el proyecto Wix (premium puede ser precondición).
- Preferencia del repo project-1415: `step-17-gift-cards-landing.md` + `step-30-gift-cards-official-app.md`.

## Objetivo

Guest puede comprar un gift card y recibirlo; member lo ve en sus órdenes.

## Pasos

1. **Producto**
   - Crear el producto/gift voucher en el dashboard Wix (importes fijos; decidir 3 opciones con el owner).
   - `src/shared/wix/catalog` (opcional): leer el producto real (`products.queryProducts` admin ApiKey) para que precios no estén hardcodeados.
2. **Add to cart (member o visitante)**
   - Visitor client (OAuthStrategy) → `cart.addItems(...)` de `@wix/ecom` client-side o en `/api/gift/cart` server con tokens de cookie si ya hay sesión.
3. **Checkout redirect**
   - `checkout.createCheckoutSessionRedirect` / la API de redirects de Wix: pasa `preferences.additionalQueryParameters.lang` = locale actual (patrón de project-1415) para que el checkout de Wix abra en el idioma del visitante.
   - redirectURI registrado (allow-list), y `returnAfter` a `/account/` (o `/account/?orders=1`).
4. **Post compra**
   - La orden aparece en `/account/` automáticamente (step-14 orders); el email de confirmación lo manda el flow de Wix sin trabajo extra.
   - Webhooks (si hacen falta para estado) → trabajo futuro; aquí solo lectura.
5. **Copy**
   - Claves `gift.*` (hero, opciones, CTA, post-redirect), traducciones en dashboard.

## Criterios de aceptación

- Compra completa (modo test del checkout) → order visible en `/account/` con total correcto → email recibido.
- `/es/regalar/` e `/it/regalar/` llegan al checkout en su idioma.

## Notas

- Si `premium only` bloquea checkout real: documentar precondición igual que reservas.
- Liberar puertos al terminar el paso y del cierre de sesión dev.

## Resultado

**Implementado (todo con API real de Wix Gift Cards, sin mocks):**

- **Producto real en Wix** (creado vía REST `POST /gift-cards/v1/gift-card-products` con la API key): "Nami Gift Card" id `ce10abbb-72e3-46a8-8ef0-b5595788d333`, presets 150 € (variant `9ddb4d9d-…`) y 250 € (variant `c3bedb40-…`), customVariant 50–1000 €, expiración RELATIVE 1 año. App **Wix Gift Cards** (appDefId `d80111c5-a0f4-47a8-b63a-65b54d774a27`) instalada en el sitio vía Apps Installer API.
- **`src/features/gift/gift-product.ts`**: `getGiftProduct()` con `@wix/gift-vouchers` (`queryGiftCardProducts`) en el admin client, cache 600 s en memoria, normaliza presets/custom a `{ id, presets[], customMin, customMax }`; si Wix falla devuelve `null` y la página cae al fallback estático (experiencias 150/250 + 50–1000) con CTA mailto.
- **`src/features/gift/gift-checkout.ts`**: flujo verificado end-to-end contra Wix: `cartV2.createCart` (catalogReference appId Gift Cards + `options.variantId` o `options.customAmount`) → `cart.createCheckout(cartId)` (v1, devuelve checkoutId) → `redirects.createRedirectSession` (`ecomCheckout.checkoutId`, `postFlowUrl` = `/account/?orders=1` localizado, `preferences.maintainIdentity` + `additionalQueryParameters.lang` = locale). Usa member client si hay sesión (cookie) o public client visitante. **Hallazgos:** el SDK devuelve el carrito "flattened" (sin wrapper `.cart`, id en `_id`); `redirects.createRedirectSession` falla con ApiKeyStrategy (solo OAuth client); no hizo falta tocar la allow-list OAuth para el postFlowUrl de localhost.
- **`src/pages/api/gift/checkout.ts`**: POST mismo-origen (`isSameOrigin`), valida variant contra el producto real y customAmount entero en [min,max]; errores mapeados: `INVALID_INPUT` 400, `PRODUCT_UNAVAILABLE`/`CHECKOUT_UNAVAILABLE` 502, `PREMIUM_ONLY` 428. Cliente Wix: módulos `cart`/`cartV2` añadidos a public/member clients; `giftVoucherProducts` al admin client.
- **`src/features/gift/regalar.astro`** reescrita (SSR, `prerender = false`): 3 tarjetas seleccionables (radio sr-only + `has-checked:ring-teja`), mapea preset→experiencia por precio igual (nombre/description de `experiences.*`), custom con input numérico min/max y rango formateado (`formatEuPrice`), CTA → POST `/api/gift/checkout` → `location.assign(redirectUrl)`. `gift-client.ts` con form `novalidate` (la validación HTML5 nativa bloqueaba el submit con min=50), panel de error con mensajes por código + `aria-live`, estado pending en el botón, mailto como fallback siempre visible.
- **i18n**: 11 claves nuevas `gift.landing.*` (preset/custom/buy/contact) en en + seed manual es/it (el CLI `wix translation` exige Node 24 y `translations:push` falló con Node 22 del sistema); note actualizada ("compra en línea segura"). JSON-LD se mantiene con ofertas estáticas 150/250.
- **E2E `src/tests/gift-checkout.spec.ts`** (5 verdes): render en 3 locales (en = raíz, no `/en/`), validación custom fuera de rango sin POST, preset → POST con `variantId` → navegación al checkout mockeado, mapeo de errores 502/428/500 con mailto, rechazo cross-origin 403 y payload inválido 400 (contrato real). Suite completa: 28 passed + 1 opt-in skipped + 1 flake aislado re-verificado verde (auth google).
- **TypeScript focalizado** limpio en `features/gift`, `api/gift` y los 3 Wix clients (tsc global tiene errores preexistentes: motion.ts Lenis, table-reservations default export, cloudflare:workers). Fix: `Tokens` se importa de `@wix/sdk` (no `@wix/sdk/auth/oauth2`); el carrito se lee con cast `as unknown as { _id?: string }`.

**Smoke real verificado:** build + preview → `/regalar/` renderiza producto real (150/250/custom desde Wix) y POST `/api/gift/checkout` (preset y custom) devuelve `redirectUrl` que con redirect llega al **checkout hosted de Wix** (200) en `wix-site-host.com` con `lang` correcto y `origin`/`postFlowUrl` a `/es/account/?orders=1/`.

**Precondición premium (documentada, igual que reservas):** el pago real (tarjeta) y el email de confirmación requieren el plan premium con Wix Payments activado en el sitio; el trial llega hasta el checkout hosted. La orden aparecerá en `/account/` vía step-14 cuando se complete un pago real.
