import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { experiences, reservationLocations, reservations } from '@wix/table-reservations';
import { items as menuItems, menus, sections as menuSections } from '@wix/restaurants';
import { getWixConfig } from './env';

export const getAdminClient = () => {
  const { apiKey, siteId } = getWixConfig();
  return createClient({
    auth: ApiKeyStrategy({ apiKey, siteId }),
    modules: { experiences, reservationLocations, reservations, menus, menuSections, menuItems },
  });
};
