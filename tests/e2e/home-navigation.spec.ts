import { expect, test } from '@playwright/test';

const sections = [
  'hero',
  'nuestros-alojamientos',
  'experiencias',
  'eventos',
  'ubicacion',
  'reservar',
] as const;

for (const width of [390, 1440]) {
  test(`las secciones de inicio son accesibles por ancla a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');

    await expect(page.locator('html')).toHaveCSS('scroll-behavior', 'smooth');
    for (const section of sections) {
      const anchor = page.locator(`#${section}`);
      await expect(anchor).toHaveCount(1);
      await expect(anchor).toBeVisible();
    }

    await page.locator('footer a[aria-label="Bahía Corral, volver al hero de inicio"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#hero')).toBeInViewport({ ratio: 0.1 });
  });

  test(`el logo del footer regresa desde una ficha al hero a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/alojamientos');

    await page.locator('footer a[aria-label="Bahía Corral, volver al hero de inicio"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('#hero')).toBeInViewport({ ratio: 0.1 });
  });
}
