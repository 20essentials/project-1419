import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { test, expect, type Page, type Route } from '@playwright/test';

const here = dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const setupMock = JSON.parse(readFileSync(join(here, 'fixtures', 'reserve-setup-mock.json'), 'utf8'));
const slotsAvailable = JSON.parse(readFileSync(join(here, 'fixtures', 'reserve-slots-available.json'), 'utf8'));
const slotsNoOpen = JSON.parse(readFileSync(join(here, 'fixtures', 'reserve-slots-no-open.json'), 'utf8'));

type SetupPayload = {
  window: string;
  slotsEmpty: string;
  errors: Record<string, string>;
  form: { required: string; email: string; phone: string; summary: string };
  done: { reservedTitle: string; requestedTitle: string; reservedBody: string; requestedBody: string };
};

type PostBody = {
  date: string;
  time: string;
  partySize: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  note?: string;
};

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8' };
const SETUP_RE = /^.*\/api\/reserve\/setup$/;
const SLOTS_RE = /^.*\/api\/reserve\/slots(\?.*)?$/;
const POST_RE = /^.*\/api\/reserve$/;

function fulfill(route: Route, status: number, body: unknown): Promise<void> {
  return route.fulfill({ status, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

function mockSetup(page: Page, status = 200, body: unknown = setupMock): void {
  void page.route(SETUP_RE, (route: Route) => fulfill(route, status, body));
}

function mockSlots(page: Page, body: unknown, status = 200): void {
  void page.route(SLOTS_RE, (route: Route) => fulfill(route, status, body));
}

function mockPost(page: Page, status: number, payload: (body: PostBody) => unknown): void {
  void page.route(POST_RE, (route: Route) =>
    fulfill(route, status, payload(route.request().postDataJSON() as PostBody)),
  );
}

async function payloadOf(page: Page): Promise<SetupPayload> {
  return page.evaluate(() =>
    JSON.parse((document.querySelector('[data-wizard-data]') as HTMLScriptElement).textContent as string),
  );
}

async function openWizard(page: Page): Promise<void> {
  await page.goto('/reserve/');
  await expect(page.locator('[data-state="wizard"]')).toBeVisible();
  await expect(page.locator('[data-party] button')).toHaveCount(8);
}

async function pickParty(page: Page, size: number): Promise<void> {
  await page.locator('[data-party] button', { hasText: String(size) }).click();
  await page.locator('[data-panel="1"] [data-next]').click();
  await expect(page.locator('[data-panel="2"]')).toBeVisible();
}

async function pickDay(page: Page, offset: number): Promise<void> {
  await page.locator('[data-calendar] button[data-date]:not(:disabled)').nth(offset).click();
  await page.locator('[data-panel="2"] [data-next]').click();
  await expect(page.locator('[data-panel="3"]')).toBeVisible();
}

async function pickTime(page: Page, time: string): Promise<void> {
  await page.locator('[data-slots] button[data-time]', { hasText: time }).click();
  await page.locator('[data-panel="3"] [data-next]').click();
  await expect(page.locator('[data-panel="4"]')).toBeVisible();
}

async function selectedDate(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (document.querySelector('[data-calendar] button[aria-pressed="true"]') as HTMLElement)?.dataset.date ?? '',
  );
}

async function fillGuest(page: Page): Promise<void> {
  await page.locator('[name="firstName"]').fill('Humo');
  await page.locator('[name="lastName"]').fill('Prueba');
  await page.locator('[name="email"]').fill('smoke-test@example.com');
  await page.locator('[name="phone"]').fill('+34600600600');
}

test.describe('wizard /reserve/ (API mocked)', () => {
  test.beforeEach(({ page }) => {
    mockSetup(page);
    mockSlots(page, slotsAvailable);
  });

  test('flujo completo termina en success con los datos de la reserva', async ({ page }) => {
    const sent: PostBody[] = [];
    mockPost(page, 200, (body) => {
      sent.push(body);
      return {
        reservation: { id: 'res-e2e-93a3bc', status: 'RESERVED', localStart: `${body.date}T${body.time}:00`, partySize: body.partySize },
      };
    });
    await openWizard(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    await pickTime(page, '19:00');
    await expect(page.locator('[data-summary]')).toContainText('19:00');
    await fillGuest(page);
    await page.locator('[name="note"]').fill('Cena silenciosa');
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-state="done"]')).toBeVisible();
    await expect(page.locator('[data-done-ref]')).toHaveText('res-e2e-93a3bc');
    await expect(page.locator('[data-done-when]')).toContainText('19:00');
    await expect(page.locator('[data-done-party]')).toContainText('2');
    expect(sent).toHaveLength(1);
    expect(sent[0].date).toBe(await selectedDate(page));
    expect(sent[0].time).toBe('19:00');
    expect(sent[0].partySize).toBe(2);
    expect(sent[0].email).toBe('smoke-test@example.com');
    expect(sent[0].note).toBe('Cena silenciosa');
  });

  test('status REQUESTED muestra el titulo de confirmacion solicitada', async ({ page }) => {
    mockPost(page, 200, (body) => ({
      reservation: { id: 'res-e2e-req', status: 'REQUESTED', localStart: `${body.date}T${body.time}:00`, partySize: body.partySize },
    }));
    await openWizard(page);
    const data = await payloadOf(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    await pickTime(page, '19:00');
    await fillGuest(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-state="done"]')).toBeVisible();
    await expect(page.locator('[data-done-title]')).toHaveText(data.done.requestedTitle);
  });

  test('validacion bloquea el submit sin datos y marca los campos', async ({ page }) => {
    await openWizard(page);
    const data = await payloadOf(page);
    await pickParty(page, 3);
    await pickDay(page, 1);
    await pickTime(page, '19:00');
    await page.locator('[data-submit]').click();
    await expect(page.locator('#reserve-first-name-error')).toHaveText(data.form.required);
    await expect(page.locator('#reserve-email-error')).toHaveText(data.form.email);
    await expect(page.locator('#reserve-phone-error')).toHaveText(data.form.phone);
    await expect(page.locator('[name="firstName"]')).toBeFocused();
    await expect(page.locator('[data-panel="4"]')).toBeVisible();
  });

  test('428 premium muestra pantalla clara sin perder el formulario', async ({ page }) => {
    mockPost(page, 428, () => ({ error: 'PREMIUM_ONLY', detail: 'premium' }));
    await openWizard(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    await pickTime(page, '19:00');
    await fillGuest(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-state="premium"]')).toBeVisible();
    const heading = page.locator('[data-state="premium"] h2');
    await expect(heading).toBeVisible();
    expect((await heading.textContent())?.trim().length ?? 0).toBeGreaterThan(0);
    await expect(page.locator('[name="firstName"]')).toHaveValue('Humo');
  });

  test('NO_AVAILABILITY tras el POST devuelve al paso de horas y recarga slots', async ({ page }) => {
    mockPost(page, 409, () => ({ error: 'NO_AVAILABILITY', detail: 'sin hueco' }));
    await openWizard(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    await pickTime(page, '19:00');
    await fillGuest(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-state="wizard"]')).toBeVisible();
    await expect(page.locator('[data-panel="3"]')).toBeVisible();
    await expect(page.locator('[data-slots] button[data-time]:not(:disabled)')).toHaveCount(3);
  });

  test('slots con error 409 muestra mensaje y boton de retry', async ({ page }) => {
    mockSlots(page, { error: 'NO_AVAILABILITY' }, 409);
    await openWizard(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    const data = await payloadOf(page);
    await expect(page.locator('[data-slots-retry]')).toBeVisible();
    await expect(page.locator('[data-panel="3"] [data-panel-error]')).toHaveText(data.errors.NO_AVAILABILITY);
  });

  test('slots sin ningun disponible muestra mensaje slotsEmpty y el back borra la hora', async ({ page }) => {
    mockSlots(page, slotsNoOpen);
    await openWizard(page);
    const data = await payloadOf(page);
    await pickParty(page, 2);
    await pickDay(page, 2);
    await expect(page.locator('[data-slots-retry]')).toBeHidden();
    await expect(page.locator('[data-panel="3"] [data-panel-error]')).toHaveText(data.slotsEmpty);
    await page.locator('[data-panel="3"] [data-prev]').click();
    await expect(page.locator('[data-panel="2"]')).toBeVisible();
    await expect(page.locator('[data-calendar] button[aria-pressed="true"]')).toHaveCount(0);
  });

  test('setup rojo muestra estado fatal con retry', async ({ page }) => {
    await page.goto('/reserve/');
    const data = await payloadOf(page);
    mockSetup(page, 502, { error: 'RESERVATION_UNAVAILABLE' });
    await page.reload();
    await expect(page.locator('[data-state="fatal"]')).toBeVisible();
    await expect(page.locator('[data-fatal]')).toHaveText(data.errors.fallback);
  });

  test('el calendario respeta la ventana y el mes navega hasta el limite', async ({ page }) => {
    await openWizard(page);
    await pickParty(page, 2);
    const buttons = page.locator('[data-calendar] button[data-date]');
    await expect(buttons).toHaveCount(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate());
    const past = page.locator('[data-calendar] button[data-date]:disabled');
    expect(await past.count()).toBeGreaterThan(0);
    await page.locator('[data-month-next]').click();
    await expect(page.locator('[data-month-prev]')).toBeEnabled();
  });

  test('layout movil del wizard: flujo completo en viewport 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    mockPost(page, 200, (body) => ({
      reservation: { id: 'res-e2e-mobile', status: 'RESERVED', localStart: `${body.date}T${body.time}:00`, partySize: body.partySize },
    }));
    await openWizard(page);
    await pickParty(page, 4);
    await pickDay(page, 1);
    await pickTime(page, '19:30');
    await fillGuest(page);
    await page.locator('[data-submit]').click();
    await expect(page.locator('[data-state="done"]')).toBeVisible();
    await expect(page.locator('[data-done-ref]')).toHaveText('res-e2e-mobile');
  });
});

test.describe('contract /api/reserve/setup real (opt-in)', () => {
  test.skip(process.env.RESERVE_E2E_REAL !== '1', 'solo local con .env y preview real: RESERVE_E2E_REAL=1');

  test('setup responde contrato valido sin mock', async ({ request }) => {
    const res = await request.get('/api/reserve/setup');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.timeZone).toBe('Europe/Madrid');
    expect(typeof body.onlineReservationsEnabled).toBe('boolean');
    expect(body.partySize.min).toBeGreaterThan(0);
    expect(Array.isArray(body.schedule)).toBe(true);
    expect(body.schedule.length).toBeGreaterThan(0);
    expect(Array.isArray(body.experiences)).toBe(true);
  });
});
