import type { Locale } from '@/shared/i18n/t';
import { mapWixMenu, staticCarta, type CartaMenu, type CartaSource } from '@/shared/site/menu-mapper';
import { getWixMenu } from '@/shared/wix/menu-client';

export interface CartaData {
  source: CartaSource;
  menu: CartaMenu;
}

const CACHE_TTL_MS = 600_000;

let cache: { data: CartaData; expiresAt: number } | null = null;

export function invalidateCartaCache(): void {
  cache = null;
}

export async function getCartaData(locale: Locale): Promise<CartaData> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;
  const payload = await getWixMenu();
  if (payload) {
    const menu = mapWixMenu(payload);
    if (menu.sections.length > 0) {
      cache = {
        data: { source: 'wix', menu },
        expiresAt: Date.now() + CACHE_TTL_MS,
      };
      return cache.data;
    }
  }
  return { source: 'static', menu: staticCarta(locale) };
}
