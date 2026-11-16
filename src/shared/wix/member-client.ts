import { createClient, OAuthStrategy } from "@wix/sdk";
import type { Tokens } from "@wix/sdk";
import { members } from "@wix/members";
import { cart, cartV2, orders } from "@wix/ecom";
import { redirects } from "@wix/redirects";
import { getWixConfig } from "./env";

export const getMemberClient = (tokens?: Tokens) => {
  const { clientId } = getWixConfig();
  return createClient({
    auth: OAuthStrategy({ clientId, tokens }),
    modules: { members, cart, cartV2, orders, redirects },
  });
};
