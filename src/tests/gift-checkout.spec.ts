import { test, expect, type Page, type Route } from '@playwright/test';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const CHECKOUT_RE = /^.*\/api\/gift\/checkout$/;
const HOSTED_CHECKOUT = 'https://checkout.wix.test/hosted?checkoutId=abc123';

function fulfill(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({ status, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

function mockHostedCheckout(page: Page): void {
  void page.route(HOSTED_CHECKOUT, (route) => route.fulfill({ status: 200, body: 'ok' }));
}

async function bindGift(page: Page): Promise<void> {
  await page.waitForFunction(() => document.querySelector('[data-gift]')?.getAttribute('data-gift-bound') === '1');
}

test.describe('gift checkout', () => {
  test('regalar page renders product options, custom input and CTA in 3 locales', async ({ page }) => {
    const localesByPrefix = [['en', '/'], ['es', '/es'], ['it', '/it']] as const;
    for (const [locale, prefix] of localesByPrefix) {
      await page.goto(prefix === '/' ? '/regalar/' : `${prefix}/regalar/`);
      await expect(page.locator('[data-gift]')).toBeVisible();
      await expect(page.locator('form[data-gift-form]')).toBeVisible();
      await expect(page.locator('input[name="gift-variant"]')).toHaveCount(3);
      const cta = page.locator('[data-gift-submit]');
      await expect(cta).toContainText(locale === 'es' ? 'Comprar tarjeta regalo' : locale === 'it' ? 'Acquista una gift card' : 'Buy a gift card');
      await expect(page.locator('#gift-amount')).toHaveAttribute('min', '50');
      await expect(page.locator('#gift-amount')).toHaveAttribute('max', '1000');
      await expect(page.locator('[data-gift] a[href^="mailto:hola@namicrestaurant.com"]').first()).toBeVisible();
    }
  });

  test('custom amount outside range shows validation error without POST', async ({ page }) => {
    mockHostedCheckout(page);
    const posts: unknown[] = [];
    await page.route(CHECKOUT_RE, (route) => fulfill(route, 200, { redirectUrl: HOSTED_CHECKOUT }));
    void page.on('request', (request) => {
      if (CHECKOUT_RE.test(request.url())) posts.push(request.postData());
    });
    await page.goto('/regalar/');
    await bindGift(page);
    await page.locator('label:has(input[name="gift-variant"][value="custom"])').click();
    await expect(page.locator('[data-gift-amount-wrap]')).toBeVisible();
    await page.locator('#gift-amount').fill('10');
    await page.locator('[data-gift-submit]').click();
    await expect(page.locator('[data-gift-error]')).toBeVisible();
    await expect(page.locator('[data-gift-error]')).toContainText('between €50 and €1,000');
    expect(posts).toHaveLength(0);
    await page.locator('#gift-amount').fill('80');
    await page.locator('[data-gift-submit]').click();
    await expect(page.locator('[data-gift-error]')).toBeHidden();
    await expect(page).toHaveURL(HOSTED_CHECKOUT);
  });

  test('preset option posts variantId and navigates to hosted checkout', async ({ page }) => {
    mockHostedCheckout(page);
    const posts: Array<{ variantId?: string; amount?: number; locale?: string }> = [];
    await page.route(CHECKOUT_RE, async (route: Route) => {
      const body = JSON.parse(route.request().postData() ?? '{}');
      posts.push(body);
      await fulfill(route, 200, { redirectUrl: HOSTED_CHECKOUT });
    });
    await page.goto('/regalar/');
    await bindGift(page);
    await page.locator('label:has(input[name="gift-variant"]:not([value="custom"]))').first().click();
    await page.locator('[data-gift-submit]').click();
    await expect(page).toHaveURL(HOSTED_CHECKOUT);
    expect(posts[0]?.variantId).toBeTruthy();
    expect(posts[0]?.amount).toBeUndefined();
  });

  test('server error codes map to friendly messages with mailto fallback', async ({ page }) => {
    const cases = [
      { status: 502, body: { error: 'PRODUCT_UNAVAILABLE' }, text: 'unavailable right now' },
      { status: 428, body: { error: 'PREMIUM_ONLY' }, text: 'not active yet' },
      { status: 500, body: { error: 'CHECKOUT_UNAVAILABLE' }, text: 'unavailable right now' },
    ];
    for (const { status, body, text } of cases) {
      await page.route(CHECKOUT_RE, (route) => fulfill(route, status, body));
      await page.goto('/regalar/');
      await bindGift(page);
      await page.locator('label:has(input[name="gift-variant"]:not([value="custom"]))').first().click();
      await page.locator('[data-gift-submit]').click();
      await expect(page.locator('[data-gift-error]')).toBeVisible();
      await expect(page.locator('[data-gift-error]')).toContainText(text);
      await expect(page.locator('[data-gift-submit]')).toBeEnabled();
    }
  });

  test('api rejects cross-origin and invalid payloads', async ({ request }) => {
    const forbidden = await request.post('http://localhost:4321/api/gift/checkout', {
      headers: { Origin: 'https://evil.example' },
      data: { amount: 80, locale: 'en' },
    });
    expect(forbidden.status()).toBe(403);
    const badBody = await request.post('http://localhost:4321/api/gift/checkout', {
      headers: { Origin: 'http://localhost:4321', Referer: 'http://localhost:4321/regalar/' },
      data: { amount: 99999, locale: 'en' },
    });
    expect(badBody.status()).toBe(400);
    expect((await badBody.json()).error).toBe('INVALID_INPUT');
  });
});
