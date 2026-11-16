import { getAdminClient } from "@/shared/wix/admin-client";

export interface GiftPresetVariant {
  id: string;
  price: number;
}

export interface GiftProduct {
  id: string;
  presets: GiftPresetVariant[];
  customMin: number;
  customMax: number;
}

export const GIFT_CUSTOM_FALLBACK = { min: 50, max: 1000 };

const CACHE_TTL_MS = 600_000;

let cache: { data: GiftProduct; at: number } | null = null;

const toNumber = (amount: string | number | undefined) => {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getGiftProduct = async (): Promise<GiftProduct | null> => {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  try {
    const client = getAdminClient();
    const { giftCardProducts } =
      await client.giftVoucherProducts.queryGiftCardProducts({});
    const product = (giftCardProducts ?? [])[0];
    if (!product?._id) throw new Error("sin gift card product");
    const presets = (product.presetVariants ?? []).flatMap((variant) => {
      const price = toNumber(variant.price?.amount);
      return variant._id && price > 0 ? [{ id: variant._id, price }] : [];
    });
    const customMin = toNumber(product.customVariant?.minValue?.amount);
    const customMax = toNumber(product.customVariant?.maxValue?.amount);
    if (presets.length === 0 && !(customMin > 0 && customMax > customMin)) {
      throw new Error("gift card sin variantes");
    }
    const data: GiftProduct = {
      id: product._id,
      presets,
      customMin,
      customMax,
    };
    cache = { data, at: Date.now() };
    return data;
  } catch (error) {
    console.error("[gift/product] failed", error);
    return null;
  }
};

export const validateGiftSelection = (
  product: GiftProduct,
  variantId: string | undefined,
  amount: number | undefined,
):
  | { kind: "preset"; variantId: string }
  | { kind: "custom"; amount: number }
  | null => {
  if (variantId)
    return product.presets.some((preset) => preset.id === variantId)
      ? { kind: "preset", variantId }
      : null;
  if (amount !== undefined) {
    return Number.isInteger(amount) &&
      amount >= product.customMin &&
      amount <= product.customMax
      ? { kind: "custom", amount }
      : null;
  }
  return null;
};
