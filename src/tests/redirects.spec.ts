import { test, expect } from '@playwright/test';

const redirects = [
  { from: '/reservar/', to: '/reserve/' },
  { from: '/reservar', to: '/reserve/' },
  { from: '/es/reservar/', to: '/es/reserve/' },
  { from: '/it/reservar/', to: '/it/reserve/' },
];

test.describe('legacy /reservar/ redirect', () => {
  for (const { from, to } of redirects) {
    test(`${from} responds 301 to ${to}`, async ({ request }) => {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status()).toBe(301);
      expect(response.headers()['location']).toBe(to);
    });
  }

  test('preserves query string', async ({ request }) => {
    const response = await request.get('/reservar/?experience=full&utm_source=x', { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()['location']).toBe('/reserve/?experience=full&utm_source=x');
  });

  test('leaves other paths as 404', async ({ request }) => {
    for (const path of ['/reservas/', '/reservar-x/']) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(404);
    }
  });

  test('target responds 200 without a redirect chain', async ({ request }) => {
    const response = await request.get('/reserve/', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });
});
