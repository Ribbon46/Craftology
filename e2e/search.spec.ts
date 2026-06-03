import { test, expect } from '@playwright/test';

test('search shows an empty state for a no-match query', async ({ page }) => {
  await page.goto('/search');
  const box = page.getByPlaceholder(/Caută/);
  await expect(box).toBeVisible();
  await box.fill('qqzzxx-no-such-product');
  await expect(page.getByText(/Nu am găsit produse/)).toBeVisible();
});
