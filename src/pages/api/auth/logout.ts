import type { APIRoute } from "astro";
import { getMemberClient } from "@/shared/wix/member-client";
import {
  clearOAuthData,
  clearSessionTokens,
  readSessionTokens,
} from "@/shared/auth/session";
import {
  absoluteUrl,
  isSameOrigin,
  redirectResponse,
  requestOrigin,
} from "@/shared/auth/http";

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) {
    return new Response(null, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const origin = requestOrigin(request);
  const tokens = readSessionTokens(cookies);
  clearSessionTokens(cookies);
  clearOAuthData(cookies);
  const home = absoluteUrl("/", origin);
  if (!tokens) return redirectResponse(home, 303);
  try {
    const { logoutUrl } = await getMemberClient(tokens).auth.logout(home);
    return redirectResponse(logoutUrl, 303);
  } catch {
    return redirectResponse(home, 303);
  }
};
