import { createClient, OAuthStrategy } from '@wix/sdk';
import type { Tokens } from '@wix/sdk';
import { experiences, reservationLocations, reservations } from '@wix/table-reservations';
import { cart, cartV2 } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { getWixConfig } from './env';

export const getPublicClient = (tokens?: Tokens) => {
  const { clientId } = getWixConfig();
  return createClient({
    auth: OAuthStrategy({ clientId, tokens }),
    modules: { experiences, reservationLocations, reservations, cart, cartV2, redirects },
  });
};
