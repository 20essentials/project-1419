import type { APIRoute } from "astro";
import { getMemberClient } from "@/shared/wix/member-client";
import {
  clearOAuthData,
  requestIsSecure,
  safeReturnTo,
  writeOAuthData,
} from "@/shared/auth/session";
import {
  absoluteUrl,
  loginErrorLocation,
  redirectResponse,
  requestOrigin,
} from "@/shared/auth/http";

export const GET: APIRoute = async ({ request, cookies }) => {
  const origin = requestOrigin(request);
  const returnTo = safeReturnTo(
    new URL(request.url).searchParams.get("returnTo"),
  );
  const callbackUri = absoluteUrl("/api/auth/callback", origin);
  const auth = getMemberClient().auth;
  const oauthData = auth.generateOAuthData(callbackUri, returnTo);
  writeOAuthData(cookies, oauthData, requestIsSecure(request));
  try {
    const { authUrl } = await auth.getAuthUrl(oauthData, {
      responseMode: "query",
    });
    return redirectResponse(authUrl, 302);
  } catch {
    clearOAuthData(cookies);
    return redirectResponse(loginErrorLocation(origin, "oauth_start"), 302);
  }
};
