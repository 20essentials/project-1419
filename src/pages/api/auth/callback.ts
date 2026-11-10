import type { APIRoute } from 'astro';
import { getMemberClient } from '@/shared/wix/member-client';
import {
  clearOAuthData,
  isMemberTokens,
  readOAuthData,
  requestIsSecure,
  safeReturnTo,
  writeSessionTokens,
} from '@/shared/auth/session';
import { loginErrorLocation, redirectResponse, requestOrigin } from '@/shared/auth/http';

export const GET: APIRoute = async ({ request, cookies }) => {
  const url = new URL(request.url);
  const origin = requestOrigin(request);
  const oauthData = readOAuthData(cookies);
  const providerError = url.searchParams.get('error');

  if (providerError) {
    clearOAuthData(cookies);
    return redirectResponse(loginErrorLocation(origin, providerError === 'access_denied' ? 'access_denied' : 'oauth_error'), 302);
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!oauthData || !code || !state) {
    clearOAuthData(cookies);
    return redirectResponse(loginErrorLocation(origin, 'oauth_callback'), 302);
  }

  if (state !== oauthData.state) {
    clearOAuthData(cookies);
    return redirectResponse(loginErrorLocation(origin, 'oauth_state'), 302);
  }

  try {
    const tokens = await getMemberClient().auth.getMemberTokens(code, state, oauthData);
    if (!isMemberTokens(tokens)) throw new Error('member tokens expected');
    writeSessionTokens(cookies, tokens, requestIsSecure(request));
    clearOAuthData(cookies);
    return redirectResponse(safeReturnTo(oauthData.originalUri), 303);
  } catch {
    clearOAuthData(cookies);
    return redirectResponse(loginErrorLocation(origin, 'oauth_failed'), 302);
  }
};
