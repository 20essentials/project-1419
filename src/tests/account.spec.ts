import { test, expect } from "@playwright/test";

const SESSION_URL = "http://localhost:4321/";

function fakeSessionCookie(): string {
  const tokens = {
    accessToken: {
      value: "e2e-fake-access",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
    refreshToken: { value: "e2e-fake-refresh", role: "member" },
  };
  return Buffer.from(JSON.stringify(tokens)).toString("base64url");
}

test.describe("account", () => {
  test("visitor is redirected to the localized login with returnTo", async ({
    page,
  }) => {
    await page.goto("/account/");
    await expect(page).toHaveURL(/\/login\/\?returnTo=%2Faccount%2F$/);
    await page.goto("/es/account/");
    await expect(page).toHaveURL(/\/es\/login\/\?returnTo=%2Fes%2Faccount%2F$/);
    await page.goto("/it/account/");
    await expect(page).toHaveURL(/\/it\/login\/\?returnTo=%2Fit%2Faccount%2F$/);
  });

  test("invalid session degrades to the translated fatal state instead of a 500", async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([
        { name: "wix-session", value: fakeSessionCookie(), url: SESSION_URL },
      ]);
    await page.goto("/account/");
    await expect(page.locator("h1")).toHaveText("We can't show your account");
    await expect(
      page.getByRole("link", { name: "Back to log in" }),
    ).toHaveAttribute("href", "/");
    await page.goto("/es/account/");
    await expect(page.locator("h1")).toHaveText("No podemos mostrar tu cuenta");
    await page.goto("/it/account/");
    await expect(page.locator("h1")).toHaveText(
      "Non possiamo mostrare il tuo account",
    );
  });

  test("profile POST without session redirects to login and foreign origin is rejected", async ({
    page,
  }) => {
    const result = await page.request.post("/api/account/profile", {
      form: { firstName: "E2E", lastName: "Test", phone: "+34 600 000 000" },
      maxRedirects: 0,
    });
    expect(result.status()).toBe(303);
    expect(
      result.headersArray().find((h) => h.name.toLowerCase() === "location")
        ?.value,
    ).toContain("/login/?returnTo=%2Faccount%2F");

    const rejected = await page.request.post("/api/account/profile", {
      form: { firstName: "E2E" },
      maxRedirects: 0,
      headers: { origin: "https://evil.test" },
    });
    expect(rejected.status()).toBe(403);
  });

  test("profile POST server contract: bad phone and dead session map to error redirects", async ({
    page,
  }) => {
    await page
      .context()
      .addCookies([
        { name: "wix-session", value: fakeSessionCookie(), url: SESSION_URL },
      ]);
    const badPhone = await page.request.post("/api/account/profile", {
      form: {
        firstName: "E2E",
        lastName: "Test",
        phone: "abc",
        returnTo: "/account/",
      },
      maxRedirects: 0,
    });
    expect(badPhone.status()).toBe(303);
    expect(
      badPhone.headersArray().find((h) => h.name.toLowerCase() === "location")
        ?.value,
    ).toContain("/account/?error=invalid");
    const deadSession = await page.request.post("/api/account/profile", {
      form: {
        firstName: "E2E",
        lastName: "Test",
        phone: "+34 600 000 000",
        returnTo: "/account/",
      },
      maxRedirects: 0,
    });
    expect(deadSession.status()).toBe(303);
    expect(
      deadSession
        .headersArray()
        .find((h) => h.name.toLowerCase() === "location")?.value,
    ).toContain("/account/?error=profile");
  });

  test("logged-out header shows the login entry on ssr pages", async ({
    page,
  }) => {
    await page.goto("/login/");
    await expect(
      page.locator('header a[href="/login/"]').first(),
    ).toBeVisible();
    await page.goto("/es/login/");
    await expect(
      page.locator('header a[href="/es/login/"]').first(),
    ).toBeVisible();
  });
});
