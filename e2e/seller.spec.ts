import { test, expect } from '@playwright/test';

test('seller application requires login when logged out', async ({ page }) => {
  await page.goto('/seller/apply');
  await expect(page.getByRole('heading', { name: 'Devino vânzător' })).toBeVisible();
  await expect(page.getByText('Autentifică-te pentru a trimite o cerere de vânzător.')).toBeVisible();
});

test('the admin sellers panel denies access to non-admins', async ({ page }) => {
  await page.goto('/admin/sellers');
  await expect(page.getByRole('heading', { name: 'Acces interzis' })).toBeVisible();
});

test('the seller dashboard requires login when logged out', async ({ page }) => {
  await page.goto('/seller/dashboard');
  await expect(page.getByRole('heading', { name: 'Panoul vânzătorului' })).toBeVisible();
});
