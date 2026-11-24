import { expect, test } from '@playwright/test';

test('el login exige usuario y ofrece recuperación de contraseña', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.getByRole('textbox', { name: 'Nombre de usuario' })).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  await expect(page.getByText('Correo electrónico', { exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page).toHaveURL(/\/admin\/recuperar-contrasena$/);
  await expect(page.getByLabel('Correo electrónico asociado a tu usuario')).toBeVisible();
});

test('un enlace de recuperación ausente muestra un error', async ({ page }) => {
  await page.goto('/admin/restablecer-contrasena');
  await expect(page.getByText('El enlace no es válido o venció.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Solicitar nuevo enlace' })).toBeVisible();
});
