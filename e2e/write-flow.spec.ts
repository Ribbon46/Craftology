import { test, expect, type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// ── Full authenticated write flow ───────────────────────────────────────────
// This creates REAL data, so it's opt-in and SKIPPED by default. To run it:
//   1. Create a Supabase user and CONFIRM its email once (the app requires it).
//   2. Provide credentials:  TEST_USER_EMAIL, TEST_USER_PASSWORD
//   3. (recommended) Provide SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL
//      so the created test listing is cleaned up afterwards.
// Ideally point the dev server at a STAGING Supabase project, not production.
//
// Run:  TEST_USER_EMAIL=… TEST_USER_PASSWORD=… npm run test:e2e -- write-flow
// ─────────────────────────────────────────────────────────────────────────────

const EMAIL = process.env.TEST_USER_EMAIL;
const PASSWORD = process.env.TEST_USER_PASSWORD;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const TITLE_PREFIX = 'Test E2E ';

// 1×1 transparent PNG — passes the createListing image whitelist.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Conectează-te' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('nume@exemplu.com').fill(EMAIL!);
  await dialog.locator('input[type="password"]').fill(PASSWORD!);
  await dialog.getByRole('button', { name: 'Autentificare' }).click();
  await expect(dialog).toBeHidden({ timeout: 15_000 });
}

test.describe('authenticated write flow', () => {
  test.skip(!EMAIL || !PASSWORD, 'set TEST_USER_EMAIL / TEST_USER_PASSWORD to run');

  test.afterAll(async () => {
    // Best-effort cleanup of any listings this suite created.
    if (SERVICE_KEY && SUPABASE_URL) {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      await admin.from('listings').delete().like('title', `${TITLE_PREFIX}%`);
    }
  });

  test('log in → create a listing → see it published', async ({ page }) => {
    await login(page);

    const title = `${TITLE_PREFIX}${Date.now()}`;
    await page.goto('/sell');
    // Authenticated users see the form, not the auth gate.
    await expect(page.getByRole('heading', { name: 'Vinde un produs' })).toBeVisible();

    await page.locator('#title').fill(title);
    await page.selectOption('#category', 'Bijuterii');
    await page.locator('#price').fill('99');
    await page.locator('#description').fill('Produs creat automat de suita E2E — de șters.');
    await page.locator('input[type="file"]').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: PNG });

    await page.getByRole('button', { name: 'Publică produsul' }).click();

    // Success screen, then it redirects home where the new listing appears.
    await expect(page.getByRole('heading', { name: 'Produs adăugat!' })).toBeVisible({ timeout: 20_000 });
  });
});
