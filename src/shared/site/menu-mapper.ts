import { dishes } from "./nami";
import { photosForMenuItem } from "./dish-photos";
import { getT, type Locale } from "@/shared/i18n/t";
import type { ImageMetadata } from "astro";
import type { WixMenuPayload } from "@/shared/wix/menu-client";

export interface MenuItem {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  photos: ImageMetadata[];
}

export interface MenuSection {
  id: string;
  title: string;
  description: string | null;
  items: MenuItem[];
}

export interface MenuDataShape {
  title: string;
  sections: MenuSection[];
}

export type MenuSource = "wix" | "static";

const localeTags: Record<Locale, string> = {
  en: "en",
  es: "es-ES",
  it: "it-IT",
};

export function formatEuPrice(price: number, locale: Locale = "en"): string {
  return new Intl.NumberFormat(localeTags[locale] ?? "en", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: Number.isInteger(price) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(price);
}

function parsePrice(price?: string | null): number | null {
  if (typeof price !== "string") return null;
  const numeric = Number(price);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : null;
}

export function mapWixMenu(payload: WixMenuPayload): MenuDataShape {
  const itemsById = new Map(
    payload.items
      .filter((item) => item._id)
      .map((item) => [item._id as string, item]),
  );
  const sectionsById = new Map(
    payload.sections
      .filter((section) => section._id)
      .map((section) => [section._id as string, section]),
  );

  const sections = (payload.menu.sectionIds ?? [])
    .map((sectionId) => sectionsById.get(sectionId))
    .filter((section) => Boolean(section) && section?.visible !== false)
    .map((section) => ({
      id: section?._id as string,
      title: section?.name ?? "",
      description: section?.description || null,
      items: (section?.itemIds ?? [])
        .map((itemId) => itemsById.get(itemId))
        .filter((item) => Boolean(item) && item?.visible !== false)
        .map((item) => ({
          id: item?._id as string,
          title: item?.name ?? "",
          description: item?.description || null,
          price: parsePrice(item?.priceInfo?.price),
          photos: photosForMenuItem(item?.name ?? ""),
        })),
    }));

  return { title: payload.menu.name ?? "", sections };
}

export function staticMenu(locale: Locale): MenuDataShape {
  const t = getT(locale);
  return {
    title: t("menu.title"),
    sections: [
      {
        id: "signature",
        title: t("menu.eyebrow"),
        description: null,
        items: dishes.map((dish) => ({
          id: dish.id,
          title: t(`menu.dishes.${dish.id}.name`),
          description: t(`menu.dishes.${dish.id}.detail`) || null,
          price: null,
        })),
      },
    ],
  };
}
