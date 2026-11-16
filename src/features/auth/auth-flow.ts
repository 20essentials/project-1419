import type { AstroCookies } from "astro";
import { LoginState } from "@wix/sdk";
import type { StateMachine } from "@wix/sdk";
import { redirects } from "@wix/redirects";
import { getWixConfig } from "@/shared/wix/env";
import { getMemberClient } from "@/shared/wix/member-client";
import {
  clearVerifyData,
  readSessionTokens,
  readVerifyData,
  requestIsSecure,
  safeReturnTo,
  writeOAuthData,
  writeVerifyData,
} from "@/shared/auth/session";
import {
  isSameOrigin,
  redirectResponse,
  requestOrigin,
} from "@/shared/auth/http";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CAPTCHA_CODES = new Set(["missingCaptchaToken", "invalidCaptchaToken"]);

export interface AuthFields {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  code: string;
  captchaToken: string;
  returnTo: string;
  failureUrl: string;
}

const rejectOrigin = () =>
  new Response(null, { status: 403, headers: { "Cache-Control": "no-store" } });

const formField = (form: FormData, name: string, max = 200) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
};

const readFields = (form: FormData): AuthFields => ({
  email: formField(form, "email").toLowerCase(),
  password: formField(form, "password"),
  firstName: formField(form, "firstName", 80),
  lastName: formField(form, "lastName", 80),
  code: formField(form, "code", 12),
  captchaToken: formField(form, "captchaToken", 5000),
  returnTo: safeReturnTo(formField(form, "returnTo", 500)),
  failureUrl: safeReturnTo(formField(form, "failureUrl", 500), "/login/"),
});

const failureRedirect = (
  request: Request,
  failureUrl: string,
  params: Record<string, string>,
) => {
  const origin = requestOrigin(request);
  const url = new URL(failureUrl, origin);
  for (const [name, value] of Object.entries(params))
    url.searchParams.set(name, value);
  return redirectResponse(`${origin}${url.pathname}${url.search}`, 303);
};

const beginMemberSession = async (
  request: Request,
  cookies: AstroCookies,
  sessionToken: string,
  returnTo: string,
) => {
  const origin = requestOrigin(request);
  const callbackUri = `${origin}/api/auth/callback`;
  const client = getMemberClient();
  const oauthData = client.auth.generateOAuthData(callbackUri, returnTo);
  writeOAuthData(cookies, oauthData, requestIsSecure(request));
  const { redirectSession } = await client.redirects.createRedirectSession({
    auth: {
      authRequest: {
        clientId: getWixConfig().clientId,
        redirectUri: callbackUri,
        codeChallenge: oauthData.codeChallenge,
        codeChallengeMethod: "S256",
        responseMode: "query",
        responseType: "code",
        scope: "offline_access",
        state: oauthData.state,
        sessionToken,
      },
      prompt: redirects.Prompt.none,
    },
  });
  if (!redirectSession?.fullUrl) throw new Error("missing redirect session");
  return redirectResponse(redirectSession.fullUrl, 303);
};

const routeStateMachine = async (
  request: Request,
  cookies: AstroCookies,
  fields: AuthFields,
  state: StateMachine,
): Promise<Response> => {
  if (state.loginState === LoginState.SUCCESS) {
    try {
      return await beginMemberSession(
        request,
        cookies,
        state.data.sessionToken,
        fields.returnTo,
      );
    } catch {
      return failureRedirect(request, fields.failureUrl, {
        error: "generic",
        email: fields.email,
        returnTo: fields.returnTo,
      });
    }
  }
  if (state.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
    writeVerifyData(
      cookies,
      { stateToken: state.data.stateToken, email: fields.email },
      requestIsSecure(request),
    );
    return failureRedirect(request, fields.failureUrl, {
      verify: "required",
      email: fields.email,
      returnTo: fields.returnTo,
    });
  }
  if (state.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
    return failureRedirect(request, fields.failureUrl, {
      error: "ownerApproval",
      returnTo: fields.returnTo,
    });
  }
  const rawErrorCode = "errorCode" in state ? state.errorCode : undefined;
  const errorCode =
    rawErrorCode && !CAPTCHA_CODES.has(rawErrorCode) ? rawErrorCode : "generic";
  if (errorCode === "resetPassword") {
    try {
      await getMemberClient().auth.sendPasswordResetEmail(
        fields.email,
        `${requestOrigin(request)}${fields.failureUrl}`,
      );
    } catch {
      return failureRedirect(request, fields.failureUrl, {
        error: "resetPassword",
        email: fields.email,
        returnTo: fields.returnTo,
      });
    }
  }
  return failureRedirect(request, fields.failureUrl, {
    error: errorCode,
    email: fields.email,
    returnTo: fields.returnTo,
  });
};

const parseAuthForm = async (request: Request): Promise<AuthFields | null> => {
  const form = await request.formData().catch(() => null);
  return form ? readFields(form) : null;
};

export const handlePasswordLogin = async (
  request: Request,
  cookies: AstroCookies,
): Promise<Response> => {
  if (!isSameOrigin(request)) return rejectOrigin();
  const fields = await parseAuthForm(request);
  if (!fields) return failureRedirect(request, "/login/", { error: "generic" });
  if (readSessionTokens(cookies)) return redirectResponse(fields.returnTo, 303);
  if (!EMAIL_PATTERN.test(fields.email)) {
    return failureRedirect(request, fields.failureUrl, {
      error: "invalidEmail",
      email: fields.email,
      returnTo: fields.returnTo,
    });
  }
  if (!fields.password) {
    return failureRedirect(request, fields.failureUrl, {
      error: "generic",
      returnTo: fields.returnTo,
    });
  }
  const captcha = fields.captchaToken
    ? { captchaTokens: { invisibleRecaptchaToken: fields.captchaToken } }
    : {};
  const state = await getMemberClient().auth.login({
    email: fields.email,
    password: fields.password,
    ...captcha,
  });
  return routeStateMachine(request, cookies, fields, state);
};

export const handlePasswordRegister = async (
  request: Request,
  cookies: AstroCookies,
): Promise<Response> => {
  if (!isSameOrigin(request)) return rejectOrigin();
  const fields = await parseAuthForm(request);
  if (!fields)
    return failureRedirect(request, "/signup/", { error: "generic" });
  if (readSessionTokens(cookies)) return redirectResponse(fields.returnTo, 303);
  if (!EMAIL_PATTERN.test(fields.email)) {
    return failureRedirect(request, fields.failureUrl, {
      error: "invalidEmail",
      email: fields.email,
      returnTo: fields.returnTo,
    });
  }
  if (fields.password.length < 8) {
    return failureRedirect(request, fields.failureUrl, {
      error: "invalidPassword",
      email: fields.email,
      returnTo: fields.returnTo,
    });
  }
  const profile =
    fields.firstName || fields.lastName
      ? {
          ...(fields.firstName ? { firstName: fields.firstName } : {}),
          ...(fields.lastName ? { lastName: fields.lastName } : {}),
        }
      : undefined;
  const captcha = fields.captchaToken
    ? { captchaTokens: { invisibleRecaptchaToken: fields.captchaToken } }
    : {};
  const state = await getMemberClient().auth.register({
    email: fields.email,
    password: fields.password,
    profile,
    ...captcha,
  });
  return routeStateMachine(request, cookies, fields, state);
};

export const handlePasswordVerify = async (
  request: Request,
  cookies: AstroCookies,
): Promise<Response> => {
  if (!isSameOrigin(request)) return rejectOrigin();
  const fields = await parseAuthForm(request);
  if (!fields) return failureRedirect(request, "/login/", { error: "generic" });
  const verify = readVerifyData(cookies);
  if (!verify || !fields.code) {
    return failureRedirect(request, fields.failureUrl, {
      error: "generic",
      returnTo: fields.returnTo,
    });
  }
  const state = await getMemberClient().auth.processVerification(
    { verificationCode: fields.code },
    {
      loginState: LoginState.EMAIL_VERIFICATION_REQUIRED,
      data: { stateToken: verify.stateToken },
    },
  );
  if (state.loginState === LoginState.SUCCESS) {
    try {
      const response = await beginMemberSession(
        request,
        cookies,
        state.data.sessionToken,
        fields.returnTo,
      );
      clearVerifyData(cookies);
      return response;
    } catch {
      return failureRedirect(request, fields.failureUrl, {
        error: "generic",
        email: verify.email,
        returnTo: fields.returnTo,
      });
    }
  }
  if (state.loginState === LoginState.EMAIL_VERIFICATION_REQUIRED) {
    writeVerifyData(
      cookies,
      { stateToken: state.data.stateToken, email: verify.email },
      requestIsSecure(request),
    );
    return failureRedirect(request, fields.failureUrl, {
      verify: "required",
      email: verify.email,
      returnTo: fields.returnTo,
    });
  }
  if (state.loginState === LoginState.OWNER_APPROVAL_REQUIRED) {
    return failureRedirect(request, fields.failureUrl, {
      error: "ownerApproval",
      returnTo: fields.returnTo,
    });
  }
  return failureRedirect(request, fields.failureUrl, {
    error: "invalidCode",
    email: verify.email,
    verify: "required",
    returnTo: fields.returnTo,
  });
};

export const handlePasswordReset = async (
  request: Request,
): Promise<Response> => {
  if (!isSameOrigin(request)) return rejectOrigin();
  const fields = await parseAuthForm(request);
  if (!fields) return failureRedirect(request, "/login/", { error: "generic" });
  if (!EMAIL_PATTERN.test(fields.email)) {
    return failureRedirect(request, fields.failureUrl, {
      error: "invalidEmail",
      email: fields.email,
    });
  }
  try {
    await getMemberClient().auth.sendPasswordResetEmail(
      fields.email,
      `${requestOrigin(request)}${fields.failureUrl}`,
    );
  } catch {
    return failureRedirect(request, fields.failureUrl, {
      reset: "sent",
      email: fields.email,
    });
  }
  return failureRedirect(request, fields.failureUrl, {
    reset: "sent",
    email: fields.email,
  });
};
