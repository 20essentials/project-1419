import type { AstroCookies } from "astro";
import type { Locale } from "@/shared/i18n/t";
import { localizedPathname } from "@/shared/i18n/routing";
import { getMemberSession, requestIsSecure } from "@/shared/auth/session";
import { getMemberClient } from "@/shared/wix/member-client";
import { getPublicClient } from "@/shared/wix/public-client";
import type { GiftProduct } from "./gift-product";

export const GIFT_CARDS_APP_ID = "d80111c5-a0f4-47a8-b63a-65b54d774a27";

export type GiftSelection =
  { kind: "preset"; variantId: string } | { kind: "custom"; amount: number };

export const createGiftCheckout = async (
  request: Request,
  cookies: AstroCookies,
  product: GiftProduct,
  selection: GiftSelection,
  locale: Locale,
): Promise<string> => {
  const session = await getMemberSession(cookies, requestIsSecure(request));
  const client = session ? getMemberClient(session) : getPublicClient();
  const options =
    selection.kind === "preset"
      ? { variantId: selection.variantId }
      : { customAmount: selection.amount };
  const cartResponse = await client.cartV2.createCart({
    catalogItems: [
      {
        catalogReference: {
          appId: GIFT_CARDS_APP_ID,
          catalogItemId: product.id,
          options,
        },
        quantity: 1,
      },
    ],
  });
  const cart = cartResponse as unknown as { _id?: string };
  const cartId = cart?._id;
  if (!cartId) throw new Error("cart sin id");
  const { checkoutId } = await client.cart.createCheckout(cartId);
  if (!checkoutId) throw new Error("checkout sin id");
  const origin = new URL(request.url).origin;
  const postFlowUrl = new URL(
    localizedPathname("/account/?orders=1", locale),
    `${origin}/`,
  ).toString();
  const { redirectSession } = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: { postFlowUrl },
    preferences: {
      maintainIdentity: true,
      additionalQueryParameters: { lang: locale },
    },
  });
  if (!redirectSession?.fullUrl)
    throw new Error("redirect session sin fullUrl");
  return redirectSession.fullUrl;
};
