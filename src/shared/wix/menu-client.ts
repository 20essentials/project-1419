import { getAdminClient } from './admin-client';

interface RawMenu {
  _id?: string | null;
  name?: string;
  description?: string | null;
  visible?: boolean | null;
  sectionIds?: string[];
}

interface RawSection {
  _id?: string | null;
  name?: string;
  description?: string | null;
  visible?: boolean | null;
  itemIds?: string[];
}

interface RawItem {
  _id?: string | null;
  name?: string;
  description?: string | null;
  visible?: boolean | null;
  priceInfo?: { price?: string | null } | null;
}

export interface WixMenuPayload {
  menu: RawMenu;
  sections: RawSection[];
  items: RawItem[];
}

export const NAMI_MENU_NAME = 'Nami';

export async function getWixMenu(): Promise<WixMenuPayload | null> {
  try {
    const client = getAdminClient();
    const { menus: menuList = [] } = await client.menus.listMenus({ onlyVisible: true });
    const menu =
      menuList.find((candidate) => candidate.name === NAMI_MENU_NAME && candidate.visible !== false) ??
      menuList.find((candidate) => candidate.visible !== false);
    if (!menu?._id) return null;
    const [{ sections: allSections = [] }, { items: allItems = [] }] = await Promise.all([
      client.menuSections.listSections({ onlyVisible: true }),
      client.menuItems.listItems({ onlyVisible: true }),
    ]);
    return { menu, sections: allSections, items: allItems };
  } catch (error) {
    console.error('[menu] menus de Wix no disponibles:', error);
    return null;
  }
}
