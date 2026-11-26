import { expect, test } from '@playwright/test';

test.skip(process.env.E2E_TEST_DATABASE !== '1', 'Sólo opera sobre pagos simulados de CI');
test.setTimeout(90_000);
test.use({ actionTimeout: 15_000, navigationTimeout: 30_000 });
for (const width of [1280, 390]) {
  test(
    'solicita, aprueba y devuelve por Mercado Pago a ' + width + 'px',
    async ({ page, baseURL }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.context().setExtraHTTPHeaders({ Origin: baseURL! });
      async function login(staff = false) {
        await page.request.post('/api/auth/sign-out');
        const response = await page.request.post('/api/auth/sign-in/username', {
          data: {
            username: process.env.E2E_USERNAME + (staff ? '_staff' : ''),
            password: process.env.E2E_PASSWORD,
          },
        });
        expect(response.ok(), await response.text()).toBeTruthy();
      }
      await login(width === 390);
      const reference = 'E2E-REFUND-' + width;
      async function openDetail() {
        await page.goto('/admin/reservas');
        await page.getByRole('button', { name: 'Ver archivados', exact: true }).click();
        await page.getByRole('searchbox', { name: 'Buscar reserva', exact: true }).fill(reference);
        await page.getByRole('button', { name: 'Ver', exact: true }).click();
      }
      await openDetail();
      const detail = page.getByRole('dialog', { name: 'Reserva ' + reference, exact: true });
      const form = detail.getByRole('form', { name: 'Solicitar devolución', exact: true });
      await expect(form).toBeVisible();
      await form.getByRole('combobox', { name: 'Tipo de devolución', exact: true }).selectOption('PARTIAL');
      await form.getByLabel('Importe a devolver (ARS)', { exact: false }).fill('40000');
      await form
        .getByLabel('Motivo de la devolución', { exact: false })
        .fill('Reintegro acordado con el huésped de prueba');
      await form.scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('solicitar-devolucion.png'), fullPage: true });
      await form.getByRole('button', { name: 'Solicitar devolución', exact: true }).click();
      await expect(detail.getByText('Solicitada', { exact: true })).toBeVisible();
      const reservationRows = (await (await page.request.get('/api/admin/reservations')).json())
        .reservations;
      const reservation = reservationRows.find(
        (r: { reference: string }) => r.reference === reference,
      );
      const summary = await (
        await page.request.get('/api/admin/refunds?reservationId=' + reservation.id)
      ).json();
      const refund = summary.summary.refunds[0];
      expect(refund.status).toBe('REQUESTED');
      if (width === 390) {
        await expect(
          detail.getByRole('button', { name: 'Aprobar solicitud', exact: true }),
        ).toHaveCount(0);
        for (const action of ['approve', 'execute']) {
          const denied = await page.request.post('/api/admin/refunds', {
            data: { action, refundId: refund.id },
          });
          expect(denied.status()).toBe(403);
        }
        await detail.getByRole('button', { name: 'Cerrar', exact: true }).click();
        await login();
        await openDetail();
      }
      await detail.getByRole('button', { name: 'Aprobar solicitud', exact: true }).click();
      await expect(detail.getByText('Aprobada', { exact: true })).toBeVisible();
      await detail.getByRole('button', { name: 'Devolver con Mercado Pago', exact: true }).click();
      const confirmation = page.getByRole('dialog', { name: 'Confirmar devolución', exact: true });
      await expect(confirmation).toContainText('$');
      await expect(confirmation).toContainText('40.000');
      await expect(confirmation).toContainText(reference);
      await page.screenshot({ path: info.outputPath('confirmar-devolucion.png'), fullPage: true });
      await confirmation.getByRole('button', { name: 'Confirmar devolución', exact: true }).click();
      await expect(confirmation).not.toBeVisible();
      await expect(detail.getByText('Devuelta', { exact: true })).toBeVisible();
      await expect(detail.getByText('Importe devuelto', { exact: true })).toBeVisible();
      await expect(detail.getByText('Neto recibido', { exact: true })).toBeVisible();
      await expect(detail).toContainText('60.000');
      await detail
        .getByRole('list', { name: 'Historial de devoluciones', exact: true })
        .scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('devolucion-confirmada.png'), fullPage: true });
      const updated = await (
        await page.request.get('/api/admin/refunds?reservationId=' + reservation.id)
      ).json();
      expect(updated.summary.refundedCents).toBe('4000000');
      expect(updated.summary.refunds[0].providerRefundId).toMatch(/^REF_E2E_/);
      expect(updated.summary.refunds[0].status).toBe('EXECUTED');
      const repeated = await page.request.post('/api/admin/refunds', {
        data: { action: 'execute', refundId: refund.id },
      });
      expect(repeated.ok(), await repeated.text()).toBeTruthy();
      expect((await repeated.json()).status).toBe('EXECUTED');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    },
  );
}
