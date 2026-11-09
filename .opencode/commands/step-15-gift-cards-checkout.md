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
