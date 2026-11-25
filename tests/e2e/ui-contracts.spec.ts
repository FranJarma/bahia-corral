import { expect, test } from '@playwright/test';

test('login: los campos requeridos indican error y la contraseña se puede mostrar', async ({ page }) => {
  await page.goto('/admin/login');

  const username = page.locator('input[autocomplete="username"]');
  const password = page.locator('input[autocomplete="current-password"]');

  await expect(page.locator('label:has(input[autocomplete="username"]) .text-red-600')).toBeVisible();
  await expect(page.locator('label:has(input[autocomplete="current-password"]) .text-red-600')).toBeVisible();

  await page.getByRole('button', { name: 'Ingresar al dashboard' }).click();
  await expect(page.getByText('Este dato es obligatorio', { exact: true })).toHaveCount(2);

  await username.fill('usuario-ejemplo');
  await expect(page.getByText('Este dato es obligatorio', { exact: true })).toHaveCount(1);

  await expect(password).toHaveAttribute('type', 'password');
  await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Ocultar contraseña' }).click();
  await expect(password).toHaveAttribute('type', 'password');
});

test('formularios públicos: errores específicos debajo de los campos obligatorios', async ({ page }) => {
  await page.goto('/contacto');
  await page.getByRole('button', { name: /Enviar mensaje/i }).click();
  await expect(page.getByText('Este dato es obligatorio', { exact: true })).toHaveCount(3);

  await page.goto('/eventos');
  await page.locator('button[type="submit"]').first().click();
  await expect(page.getByText('Este dato es obligatorio', { exact: true })).toHaveCount(4);
});

test('íconos y manifest: los recursos del logo existen y están declarados', async ({ page, request }) => {
  await page.goto('/');

  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/site.webmanifest');
  await expect(page.locator('link[rel="icon"][sizes="16x16"]')).toHaveAttribute('href', '/favicon-16x16.png');
  await expect(page.locator('link[rel="icon"][sizes="32x32"]')).toHaveAttribute('href', '/favicon-32x32.png');

  for (const file of [
    'apple-touch-icon.png',
    'favicon-16x16.png',
    'favicon-32x32.png',
    'favicon.ico',
    'site.webmanifest',
    'android-chrome-192x192.png',
    'android-chrome-512x512.png',
  ]) {
    const response = await request.get('/' + file);
    expect(response.ok(), `El recurso ${file} debe existir`).toBe(true);
  }
});

test('catálogo: el ícono de búsqueda no se superpone con el texto', async ({ page }) => {
  await page.goto('/alojamientos');
  const search = page.getByRole('searchbox', { name: 'Buscar alojamiento' });
  await expect(search).toBeVisible();
  const padding = await search.evaluate((element) => parseFloat(getComputedStyle(element).paddingLeft));
  expect(padding).toBeGreaterThanOrEqual(40);
});
