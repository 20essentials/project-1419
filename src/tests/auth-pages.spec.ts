import { test, expect, type Page, type Route } from "@playwright/test";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const REDIRECT_SESSION_RE = /^.*\/redirect-session$/;
const TOKEN_RE = /^.*\/oauth2\/token$/;
const RECAPTCHA_RE = /^.*\/recaptcha\/enterprise\.js.*$/;

function fulfill(route: Route, body: unknown): Promise<void> {
  return route.fulfill({
    status: 200,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
}

async function blockCaptcha(page: Page): Promise<void> {
  await page.route(RECAPTCHA_RE, (route: Route) => route.abort());
}

test.describe("auth pages", () => {
  test("login page renders nami chrome, form and social buttons in 3 locales", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/login/");
    await expect(page.locator("h1")).toHaveText("Welcome back");
    await expect(page.locator("#auth-email")).toBeVisible();
    await expect(page.locator("#auth-password")).toBeVisible();
    await expect(page.locator('[data-idp="google"]')).toContainText(
      "Continue with Google",
    );
    await expect(page.locator('[data-idp="facebook"]')).toContainText(
      "Continue with Facebook",
    );
    const payload = await page.evaluate(() =>
      JSON.parse(
        (document.querySelector("[data-auth-config]") as HTMLScriptElement)
          .textContent as string,
      ),
    );
    expect(payload.clientId).toMatch(/^[0-9a-f-]{36}$/);
    expect(payload.callbackPath).toBe("/auth/callback");
    expect(payload.loginPath).toBe("/login/");
    await page.goto("/es/login/");
    await expect(page.locator("h1")).toHaveText("Bienvenido de nuevo");
    await page.goto("/it/signup/");
    await expect(page.locator("h1")).toHaveText("Crea il tuo account");
  });

  test("error banner and verify/reset states render from query params", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/login/?error=invalidEmail");
    await expect(page.locator('[role="alert"]')).toBeVisible();
    await page.goto("/login/?verify=required&email=you@email.com");
    await expect(page.locator("#auth-code")).toBeVisible();
    await expect(
      page.locator('form[action="/api/auth/password-verify"]'),
    ).toBeVisible();
    await page.goto("/login/?reset=1");
    await expect(
      page.locator('form[action="/api/auth/password-reset"]'),
    ).toBeVisible();
    await page.goto("/login/?reset=sent&email=you@email.com");
    await expect(page.getByText("Check your inbox")).toBeVisible();
    await expect(page.locator('[data-idp="google"]')).toHaveCount(0);
  });

  test("forgot link opens the reset form and back link returns to login", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/login/");
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await expect(
      page.locator('form[action="/api/auth/password-reset"]'),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to log in" }).click();
    await expect(page.locator("#auth-email")).toBeVisible();
  });

  test("password login with wrong credentials shows the translated error", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/login/?returnTo=/reserve/");
    await page.fill("#auth-email", "auth-smoke@namicrestaurant.com");
    await page.fill("#auth-password", "wrong-password-1");
    await page
      .locator('form[action="/api/auth/password-login"] button[type="submit"]')
      .click();
    await expect(page).toHaveURL(/\/login\/\?error=invalidPassword/);
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("google button stores oauth data and reaches the mocked callback with session cookie", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.route(REDIRECT_SESSION_RE, (route: Route) => {
      const body = route.request().postDataJSON() as {
        auth?: { authRequest?: { state?: string; responseMode?: string } };
        prompt?: string;
      };
      const state = body.auth?.authRequest?.state ?? "unknown";
      return fulfill(route, {
        redirectSession: {
          fullUrl: `http://localhost:4321/auth/callback#code=mock-code&state=${state}`,
          urlDetails: { endpoint: "https://www.wixapis.com/oauth2/authorize" },
        },
      });
    });
    await page.route(TOKEN_RE, (route: Route) =>
      fulfill(route, {
        access_token: "mock-access",
        refresh_token: "mock-refresh",
        expires_in: 14400,
        token_type: "Bearer",
      }),
    );

    await page.goto("/login/?returnTo=/reserve/");
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("wixOAuthData"),
    );
    expect(stored).toBeNull();

    await page.locator('[data-idp="google"]').click();
    await expect(page).toHaveURL(/\/reserve\//, { timeout: 20_000 });
    await expect(page.locator('[data-state="wizard"]')).toBeVisible();
    expect(
      await page.evaluate(() => window.localStorage.getItem("wixOAuthData")),
    ).toBeNull();

    const cookies = await page.context().cookies();
    expect(cookies.find((c) => c.name === "wix-session")).toBeTruthy();
    expect(cookies.find((c) => c.name === "wix-oauth")).toBeUndefined();

    const check = await page.evaluate(async () => {
      const r = await fetch("/api/dev/auth-check");
      return (await r.json()) as { loggedIn: boolean };
    });
    expect(check.loggedIn).toBe(true);

    await page.goto("/login/?returnTo=/es/account/");
    await expect(page).toHaveURL(/\/es\/account\//);
  });

  test("callback redirects to error when fragment is missing", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/auth/callback");
    await expect(page).toHaveURL(/\/login\/\?error=oauth_callback/);
  });

  test("callback detects a state mismatch and clears stored oauth data", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/login/");
    await page.evaluate(() =>
      window.localStorage.setItem(
        "wixOAuthData",
        JSON.stringify({
          state: "expected",
          codeVerifier: "v",
          codeChallenge: "c",
          redirectUri: "http://localhost:4321/auth/callback",
          originalUri: "/reserve/",
        }),
      ),
    );
    await page.goto("/auth/callback#code=some-code&state=unexpected");
    await expect(page).toHaveURL(/\/login\/\?error=oauth_state/);
    expect(
      await page.evaluate(() => window.localStorage.getItem("wixOAuthData")),
    ).toBeNull();
  });

  test("provider cancellation maps to a friendly banner", async ({ page }) => {
    await blockCaptcha(page);
    await page.goto("/auth/callback#error=access_denied");
    await expect(page).toHaveURL(/\/login\/\?error=access_denied/);
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test("signup form requires a password of at least 8 characters and links the legal note", async ({
    page,
  }) => {
    await blockCaptcha(page);
    await page.goto("/signup/");
    await expect(page.locator("#auth-password")).toHaveAttribute(
      "minlength",
      "8",
    );
    await expect(
      page.locator('form[action="/api/auth/password-register"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Privacy" }).first(),
    ).toBeVisible();
    const switchLink = page.locator("a.link.ml-1", { hasText: "Log in" });
    await expect(switchLink).toBeVisible();
    await switchLink.click();
    await expect(page).toHaveURL(/\/login\//);
  });
});
