import { test, expect } from '@playwright/test';

// Write-flow entry gates (no auth / no data created — always run).

test('messaging a seller while logged out opens the auth modal', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href^="/listings/"]').first().click();
  await expect(page).toHaveURL(/\/listings\/.+/);
  await page.getByRole('button', { name: /Trimite mesaj/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Bine ai venit la Craftology')).toBeVisible();
});

test('the sell page requires authentication when logged out', async ({ page }) => {
  await page.goto('/sell');
  await expect(page.getByRole('heading', { name: 'Autentificare necesară' })).toBeVisible();
});
