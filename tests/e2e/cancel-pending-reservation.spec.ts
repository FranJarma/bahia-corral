import { randomUUID } from 'node:crypto';

import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_TEST_DATABASE !== '1', 'Sólo modifica la base descartable de CI');
for (const width of [1280, 390]) {
  test(
    'anula una reserva por confirmar desde el backoffice a ' + width + 'px',
    async ({ page, baseURL }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().setExtraHTTPHeaders({ Origin: baseURL! });
      const unit = (await (await page.request.get('/api/public/units?slug=cabana-1')).json()).unit;
      const checkin = width === 1280 ? '2030-01-10' : '2030-01-12';
      const checkout = width === 1280 ? '2030-01-11' : '2030-01-13';
      const started = await page.request.post('/api/public/checkout/start', {
        data: { unitId: unit.id, checkin, checkout, adults: 2, childAges: [] },
      });
      expect(started.status(), await started.text()).toBe(201);
      const hold = await started.json();
      const identified = await page.request.post('/api/public/checkout/guest', {
        data: {
          holdId: hold.holdId,
          checkoutToken: hold.checkoutToken,
          contact: {
            firstName: 'Persona',
            lastName: 'Anulación',
            email: 'cancel-' + randomUUID() + '@example.com',
            phone: '3870000000',
          },
        },
      });
      expect(identified.status(), await identified.text()).toBe(201);
      const reservation = await identified.json();
      const endpoint = '/api/admin/reservations/' + reservation.reservationId;
      expect(
        (
          await page.request.patch(endpoint, { data: { action: 'cancel', reason: 'Sin acceso' } })
        ).status(),
      ).toBe(401);
      const login = await page.request.post('/api/auth/sign-in/username', {
        data: {
          username: process.env.E2E_USERNAME + (width === 390 ? '_staff' : ''),
          password: process.env.E2E_PASSWORD,
        },
      });
      expect(login.ok(), await login.text()).toBeTruthy();
      expect(
        (
          await page.request.patch(endpoint, { data: { action: 'cancel', reason: '   ' } })
        ).status(),
      ).toBe(400);
      await page.goto('/admin/reservas');
      await page
        .getByRole('searchbox', { name: 'Buscar reserva', exact: true })
        .fill(reservation.reference);
      await page.getByRole('button', { name: 'Ver', exact: true }).click();
      const detail = page.getByRole('dialog', {
        name: 'Reserva ' + reservation.reference,
        exact: true,
      });
      await expect(detail.getByText('Por Confirmar', { exact: true })).toBeVisible();
      const cancel = detail.getByRole('button', { name: 'Anular reserva', exact: true });
      await cancel.click();
      const confirmation = page.getByRole('dialog', { name: '¿Anular esta reserva?', exact: true });
      await expect(confirmation).toContainText(reservation.reference);
      await expect(confirmation).toContainText(unit.name);
      await confirmation.getByRole('button', { name: 'Mantener reserva', exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await expect(cancel).toBeFocused();
      await expect(detail.getByText('Por Confirmar', { exact: true })).toBeVisible();
      await cancel.click();
      await confirmation.getByRole('button', { name: 'Confirmar anulación', exact: true }).click();
      await expect(confirmation.getByRole('alert')).toBeVisible();
      await confirmation
        .getByLabel('Motivo de anulación', { exact: false })
        .fill('Solicitud del huésped de prueba');
      await page.screenshot({ path: info.outputPath('anular-reserva.png'), fullPage: true });
      await confirmation.getByRole('button', { name: 'Confirmar anulación', exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await expect(detail.getByText('Cancelada', { exact: true })).toBeVisible();
      await expect(detail.getByText('Saldo pendiente', { exact: true })).toHaveCount(0);
      await expect(detail.getByRole('button', { name: 'Anular reserva', exact: true })).toHaveCount(
        0,
      );
      await page.screenshot({ path: info.outputPath('reserva-anulada.png'), fullPage: true });
      await detail.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await page.getByRole('button', { name: 'Ver archivados', exact: true }).click();
      await expect(page.getByRole('cell', { name: 'Cancelada', exact: true })).toBeVisible();
      const released = await page.request.post('/api/public/checkout/start', {
        data: { unitId: unit.id, checkin, checkout, adults: 2, childAges: [] },
      });
      expect(released.status(), await released.text()).toBe(201);
      expect((await released.json()).holdId).not.toBe(hold.holdId);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    },
  );
}
