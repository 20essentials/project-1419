import { createClient, ApiKeyStrategy } from '@wix/sdk';
import { experiences, reservationLocations, reservations, timeSlots } from '@wix/table-reservations';
import { items as menuItems, menus, sections as menuSections } from '@wix/restaurants';
import { locations } from '@wix/business-tools';
import { getWixConfig } from './env';

export const getAdminClient = () => {
  const { apiKey, siteId } = getWixConfig();
  return createClient({
    auth: ApiKeyStrategy({ apiKey, siteId }),
    modules: { locations, experiences, reservationLocations, reservations, timeSlots, menus, menuSections, menuItems },
  });
};
