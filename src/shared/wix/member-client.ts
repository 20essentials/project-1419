import { createClient, OAuthStrategy } from '@wix/sdk';
import type { Tokens } from '@wix/sdk';
import { members } from '@wix/members';
import { getWixConfig } from './env';

export const getMemberClient = (tokens?: Tokens) => {
  const { clientId } = getWixConfig();
  return createClient({
    auth: OAuthStrategy({ clientId, tokens }),
    modules: { members },
  });
};
