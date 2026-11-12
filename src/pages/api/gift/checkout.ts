import type { APIRoute } from 'astro';
import { locales, type Locale } from '@/shared/i18n/t';
import { isSameOrigin } from '@/shared/auth/http';
import { getGiftProduct, validateGiftSelection } from '@/features/gift/gift-product';
import { createGiftCheckout } from '@/features/gift/gift-checkout';
import { isGiftError, jsonError, jsonOk, GIFT_ERROR_STATUS } from '@/features/gift/gift-error';

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) {
    return new Response(null, { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }
  const body = (await request.json().catch(() => null)) as
    | { variantId?: string; amount?: number; locale?: string }
    | null;
  if (!body || (typeof body.variantId !== 'string' && typeof body.amount !== 'number')) {
    return jsonError('INVALID_INPUT', GIFT_ERROR_STATUS.INVALID_INPUT);
  }
  const locale: Locale = locales.includes(body.locale as Locale) ? (body.locale as Locale) : 'en';
  const product = await getGiftProduct();
  if (!product) return jsonError('PRODUCT_UNAVAILABLE', GIFT_ERROR_STATUS.PRODUCT_UNAVAILABLE);
  const selection = validateGiftSelection(product, body.variantId, body.amount);
  if (!selection) return jsonError('INVALID_INPUT', GIFT_ERROR_STATUS.INVALID_INPUT);
  try {
    const redirectUrl = await createGiftCheckout(request, cookies, product, selection, locale);
    return jsonOk({ redirectUrl });
  } catch (error) {
    console.error('[gift/checkout] failed', error);
    if (isGiftError(error)) return jsonError(error.code, error.status);
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: number }).status) : 0;
    if (status === 428) return jsonError('PREMIUM_ONLY', GIFT_ERROR_STATUS.PREMIUM_ONLY);
    return jsonError('CHECKOUT_UNAVAILABLE', GIFT_ERROR_STATUS.CHECKOUT_UNAVAILABLE);
  }
};
