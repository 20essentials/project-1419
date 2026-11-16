import type { APIRoute } from "astro";
import { updateAccountProfile } from "@/features/account/account-data";
import {
  getMemberSession,
  requestIsSecure,
  safeReturnTo,
} from "@/shared/auth/session";
import {
  isSameOrigin,
  redirectResponse,
  requestOrigin,
} from "@/shared/auth/http";

const PHONE_PATTERN = /^[+()\d\s.-]{5,40}$/;

export const POST: APIRoute = async ({ request, cookies }) => {
  const origin = requestOrigin(request);
  if (!isSameOrigin(request)) {
    return new Response(null, {
      status: 403,
      headers: { "Cache-Control": "no-store" },
    });
  }
  const session = await getMemberSession(cookies, requestIsSecure(request));
  if (!session) {
    return redirectResponse(
      `${origin}/login/?returnTo=${encodeURIComponent("/account/")}`,
      303,
    );
  }
  const form = await request.formData().catch(() => null);
  if (!form) return redirectResponse(`${origin}/account/?error=profile`, 303);
  const field = (name: string, max: number) => {
    const value = form.get(name);
    return typeof value === "string" ? value.trim().slice(0, max) : "";
  };
  const firstName = field("firstName", 80);
  const lastName = field("lastName", 80);
  const phone = field("phone", 40);
  const returnTo = safeReturnTo(field("returnTo", 500), "/account/");
  if (phone && !PHONE_PATTERN.test(phone)) {
    return redirectResponse(`${origin}${returnTo}?error=invalid`, 303);
  }
  try {
    await updateAccountProfile(session, { firstName, lastName, phone });
    return redirectResponse(`${origin}${returnTo}?saved=1`, 303);
  } catch {
    return redirectResponse(`${origin}${returnTo}?error=profile`, 303);
  }
};
