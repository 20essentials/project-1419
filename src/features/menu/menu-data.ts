import type { Locale } from "@/shared/i18n/t";
import {
  mapWixMenu,
  staticMenu,
  type MenuDataShape,
  type MenuSource,
} from "@/shared/site/menu-mapper";
import { getWixMenu } from "@/shared/wix/menu-client";

export interface MenuData {
  source: MenuSource;
  menu: MenuDataShape;
}

const CACHE_TTL_MS = 600_000;

let cache: { data: MenuData; expiresAt: number } | null = null;

export function invalidateMenuCache(): void {
  cache = null;
}

export async function getMenuData(locale: Locale): Promise<MenuData> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  const payload = await getWixMenu();
  if (payload) {
    const menu = mapWixMenu(payload);
    if (menu.sections.length > 0) {
      cache = {
        data: { source: "wix", menu },
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return cache.data;
    }
  }
  return { source: "static", menu: staticMenu(locale) };
}
