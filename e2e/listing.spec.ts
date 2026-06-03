import { test, expect } from '@playwright/test';

test('opening a product shows the detail page with actions', async ({ page }) => {
  await page.goto('/');
  await page.locator('a[href^="/listings/"]').first().click();
  await expect(page).toHaveURL(/\/listings\/.+/);
  // Static content + interactive island both present.
  await expect(page.getByRole('button', { name: /Cump/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Trimite mesaj/ })).toBeVisible();
});

test('an unknown listing id returns a real 404', async ({ page }) => {
  const res = await page.goto('/listings/this-id-does-not-exist');
  expect(res?.status()).toBe(404);
});

test('a shared product link carries Open Graph metadata', async ({ page, request }) => {
  // Find a real listing id from the feed, then fetch its raw HTML.
  await page.goto('/');
  const href = await page.locator('a[href^="/listings/"]').first().getAttribute('href');
  expect(href).toBeTruthy();
  const html = await (await request.get(href!)).text();
  expect(html).toContain('property="og:title"');
  expect(html).toContain('property="og:image"');
});
