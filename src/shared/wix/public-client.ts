import { createClient, OAuthStrategy } from '@wix/sdk';
import type { Tokens } from '@wix/sdk/auth/oauth2';
import { experiences, reservationLocations, reservations } from '@wix/table-reservations';
import { getWixConfig } from './env';

export const getPublicClient = (tokens?: Tokens) => {
  const { clientId } = getWixConfig();
  return createClient({
    auth: OAuthStrategy({ clientId, tokens }),
    modules: { experiences, reservationLocations, reservations },
  });
};
