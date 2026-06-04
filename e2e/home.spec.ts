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

test('sorting by price orders the feed ascending', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Sortează').selectOption('price_asc');
  // Poll until the rendered card prices are in non-decreasing order.
  await expect
    .poll(
      async () => {
        const texts = await page.locator('.price').allInnerTexts();
        const prices = texts.map((t) => parseInt(t.replace(/\D/g, ''), 10)).filter((n) => !Number.isNaN(n));
        return prices.length > 1 && prices.every((p, i) => i === 0 || prices[i - 1] <= p);
      },
      { timeout: 8000 },
    )
    .toBe(true);
});
