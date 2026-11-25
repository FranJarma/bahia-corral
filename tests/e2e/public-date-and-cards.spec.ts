import { expect, test } from '@playwright/test';
const fullDate = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
function shift(value: string, days: number) {
  const d = new Date(value + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}
for (const width of [1440, 390]) {
  test.describe('Calendario y alojamientos a ' + width + 'px', () => {
    test.use({ viewport: { width, height: 900 }, actionTimeout: 15000 });
    test('el calendario de marca aplica fechas y conserva cambios cancelados', async ({
      page,
    }, info) => {
      await page.goto('/');
      const arrival = page.getByLabel('Llegada', { exact: true }).first();
      const departure = page.getByLabel('Salida', { exact: true }).first();
      const previous = await arrival.inputValue();
      const next = shift(previous, 1);
      await arrival.click();
      const picker = page.getByRole('dialog', { name: 'Elegir fecha', exact: true });
      await expect(picker).toBeVisible();
      await picker
        .getByRole('button', { name: fullDate.format(new Date(next + 'T12:00:00')), exact: true })
        .click();
      await expect(arrival).toHaveValue(previous);
      await page.screenshot({ path: info.outputPath('calendario-marca.png') });
      await picker.getByRole('button', { name: 'Aplicar fecha', exact: true }).click();
      await expect(picker).not.toBeVisible();
      await expect(arrival).toHaveValue(next);
      const checkout = await departure.inputValue();
      await departure.click();
      await picker.getByRole('button', { name: 'Cerrar', exact: true }).click();
      await expect(departure).toHaveValue(checkout);
      await departure.click();
      await page.keyboard.press('Escape');
      await expect(picker).not.toBeVisible();
      await expect(departure).toBeFocused();
      await page
        .getByRole('button', { name: /Buscar disponibilidad/i })
        .first()
        .click();
      await expect(page).toHaveURL(
        (url) =>
          url.pathname === '/reservar' &&
          url.searchParams.get('checkin') === next &&
          url.searchParams.get('checkout') === checkout,
      );
      await expect(page.getByLabel('Cantidad de noches', { exact: true })).toHaveText('1 noche');
      await page.getByLabel('Check-in', { exact: false }).click();
      await expect(picker).toBeVisible();
      await page.keyboard.press('Escape');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBeTruthy();
    });
    test('las cards reservan el mismo espacio para texto y precios', async ({ page }, info) => {
      await page.goto('/');
      const cards = page.locator('[data-accommodation-card]');
      await expect(cards).toHaveCount(6);
      await page.evaluate(() => document.fonts.ready);
      const firstWidth = await cards.first().evaluate(card => ({card:card.getBoundingClientRect().width,container:card.parentElement!.clientWidth}));
      expect(firstWidth.card).toBeLessThanOrEqual(firstWidth.container + 1);
      const geometry = await cards.evaluateAll((elements) =>
        elements.map((card) => {
          const box = card.getBoundingClientRect();
          const description = card
            .querySelector('[data-accommodation-description]')!
            .getBoundingClientRect();
          const footer = card.querySelector('[data-accommodation-footer]')!.getBoundingClientRect();
          return {
            height: box.height,
            description: description.height,
            footerFromBottom: box.bottom - footer.bottom,
          };
        }),
      );
      expect(
        Math.max(...geometry.map((g) => g.height)) - Math.min(...geometry.map((g) => g.height)),
      ).toBeLessThan(2);
      expect(
        Math.max(...geometry.map((g) => g.description)) -
          Math.min(...geometry.map((g) => g.description)),
      ).toBeLessThan(1);
      expect(
        Math.max(...geometry.map((g) => g.footerFromBottom)) -
          Math.min(...geometry.map((g) => g.footerFromBottom)),
      ).toBeLessThan(2);
      await cards.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('cards-alojamientos.png') });
      await page.goto('/alojamientos');
      const listing = page.locator('[data-accommodation-card]');
      await expect(listing).toHaveCount(6);
      const heights = await listing.evaluateAll((elements) =>
        elements.map((card) => card.getBoundingClientRect().height),
      );
      expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
      await listing.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: info.outputPath('listado-alojamientos.png') });
    });
  });
}
