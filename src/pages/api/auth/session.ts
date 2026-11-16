import type { APIRoute } from "astro";
import {
  clearOAuthData,
  isMemberTokens,
  requestIsSecure,
  writeSessionTokens,
} from "@/shared/auth/session";
import { isSameOrigin } from "@/shared/auth/http";

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) {
    return new Response(null, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  if (
    !(request.headers.get("content-type") ?? "").includes("application/json")
  ) {
    return new Response(null, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(null, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const candidate =
    body && typeof body === "object" && "tokens" in body
      ? (body as { tokens: unknown }).tokens
      : body;
  if (!isMemberTokens(candidate)) {
    return new Response(null, {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }
  writeSessionTokens(cookies, candidate, requestIsSecure(request));
  clearOAuthData(cookies);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
};
