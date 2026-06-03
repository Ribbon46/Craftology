import { test, expect } from '@playwright/test';

test('the header auth button opens the login / sign-up modal', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Conectează-te' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Bine ai venit la Craftology')).toBeVisible();
  // Can switch to the sign-up form.
  await dialog.getByRole('button', { name: 'Înregistrează-te' }).click();
  await expect(dialog.getByText('Creează un cont')).toBeVisible();
});

test('the theme toggle switches to dark and persists across reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Comută tema' }).click();
  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(html).toHaveClass(/dark/);
});
