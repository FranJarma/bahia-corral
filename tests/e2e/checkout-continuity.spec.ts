import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_TEST_DATABASE !== '1', 'Sólo usa la base descartable de CI');
for (const width of [1280, 390]) {
  test(
    'retoma el checkout en el mismo navegador sin duplicar reservas a ' + width + 'px',
    async ({ page, baseURL }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().setExtraHTTPHeaders({ Origin: baseURL! });
      const unit = (await (await page.request.get('/api/public/units?slug=cabana-1')).json()).unit;
      const checkin = width === 1280 ? '2028-02-20' : '2028-02-22';
      const checkout = width === 1280 ? '2028-02-21' : '2028-02-23';
      const first = await page.request.post('/api/public/checkout/start', {
        data: { unitId: unit.id, checkin, checkout, adults: 2, childAges: [3] },
      });
      expect(first.status(), await first.text()).toBe(201);
      const hold = await first.json();
      const contact = {
        firstName: 'Persona',
        lastName: 'Continuidad',
        email: 'continuity-' + randomUUID() + '@example.com',
        phone: '3870000000',
      };
      const saved = await page.request.post('/api/public/checkout/guest', {
        data: { holdId: hold.holdId, checkoutToken: hold.checkoutToken, contact },
      });
      expect(saved.status(), await saved.text()).toBe(201);
      const reservation = await saved.json();
      const retried = await page.request.post('/api/public/checkout/guest', {
        data: { holdId: hold.holdId, checkoutToken: hold.checkoutToken, contact },
      });
      expect(retried.ok(), await retried.text()).toBeTruthy();
      expect((await retried.json()).reservationId).toBe(reservation.reservationId);
      const again = await page.request.post('/api/public/checkout/start', {
        data: {
          unitId: unit.id,
          checkin: '2028-03-01',
          checkout: '2028-03-02',
          adults: 1,
          childAges: [],
        },
      });
      expect(again.status(), await again.text()).toBe(200);
      expect((await again.json()).holdId).toBe(hold.holdId);
      const session = await page.request.get('/api/public/checkout/session');
      expect(session.status()).toBe(200);
      expect((await session.json()).checkout.reservationId).toBe(reservation.reservationId);
      await page.goto('/reservar?checkin=2028-03-01&checkout=2028-03-02');
      await expect(
        page.getByRole('heading', { name: 'Elegí cómo pagar', exact: true }),
      ).toBeVisible();
      await expect(page.getByText(reservation.reference, { exact: false })).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole('heading', { name: 'Elegí cómo pagar', exact: true }),
      ).toBeVisible();
      await expect(page.getByText('Por Confirmar', { exact: true })).toBeVisible();
      await page.screenshot({ path: info.outputPath('checkout-retomado.png'), fullPage: true });
      await page.request.post('/api/auth/sign-in/username', {
        data: { username: process.env.E2E_USERNAME, password: process.env.E2E_PASSWORD },
      });
      await page.goto('/admin/reservas');
      await page
        .getByRole('searchbox', { name: 'Buscar reserva', exact: true })
        .fill(reservation.reference);
      await page.getByRole('button', { name: 'Ver', exact: true }).click();
      await expect(page).toHaveURL(/\/admin\/reservas$/);
      const detail = page.getByRole('dialog', {
        name: 'Reserva ' + reservation.reference,
        exact: true,
      });
      await expect(detail.getByText('Por Confirmar', { exact: true })).toBeVisible();
      await expect(detail.getByText('PENDING_CONFIRMATION', { exact: true })).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('detalle-pendiente.png'), fullPage: true });
      await page.keyboard.press('Escape');
      await expect(detail).not.toBeVisible();
    },
  );
}

for (const width of [1280, 390]) {
  test(
    'explica la falta de disponibilidad y permite elegir otra cabaña a ' + width + 'px',
    async ({ page, baseURL }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().setExtraHTTPHeaders({ Origin: baseURL! });
      const unit = (await (await page.request.get('/api/public/units?slug=cabana-1')).json()).unit;
      const checkin = width === 1280 ? '2029-09-10' : '2029-09-12';
      const checkout = width === 1280 ? '2029-09-11' : '2029-09-13';
      const login = await page.request.post('/api/auth/sign-in/username', {
        data: {
          username: process.env.E2E_USERNAME,
          password: process.env.E2E_PASSWORD,
        },
      });
      expect(login.ok()).toBeTruthy();
      const blocked = await page.request.post('/api/admin/blocks', {
        data: {
          unitId: unit.id,
          checkin,
          checkout,
          reason: 'Bloqueo ficticio de disponibilidad',
        },
      });
      expect(blocked.status(), await blocked.text()).toBe(201);
      await page.goto(
        '/reservar?alojamiento=cabana-1&checkin=' + checkin + '&checkout=' + checkout,
      );
      const next = page.getByRole('button', { name: 'Continuar', exact: true }).first();
      await expect(next).toBeEnabled();
      await next.click();
      const alert = page.getByRole('alert');
      await expect(alert).toContainText('no está disponible');
      await expect(alert).toContainText('fechas');
      await expect(alert).not.toContainText('No pudimos completar la operación');
      await page.screenshot({
        path: info.outputPath('alojamiento-no-disponible.png'),
        fullPage: true,
      });
      await page
        .getByRole('combobox', { name: 'Elegir alojamiento', exact: true })
        .selectOption('cabana-2');
      await expect(next).toBeEnabled();
      await next.click();
      await expect(
        page.getByRole('heading', { name: 'Tus datos para reservar', exact: true }),
      ).toBeVisible();
    },
  );
}
