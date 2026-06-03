import { test, expect } from '@playwright/test';

test('home renders the feed (server-rendered) and shows products', async ({ page }) => {
  await page.goto('/');
  // Editorial hero for the default "all" view.
  await expect(page.getByRole('heading', { name: 'Lucrate manual, cu suflet' })).toBeVisible();
  // At least one product card links to a listing.
  const cards = page.locator('a[href^="/listings/"]');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
});

test('category chips filter the feed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bijuterii' }).click();
  // The hero headline switches to the chosen category.
  await expect(page.getByRole('heading', { name: 'Bijuterii' })).toBeVisible();
});
