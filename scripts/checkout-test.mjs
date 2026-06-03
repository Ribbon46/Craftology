// End-to-end test of the Stripe "Cumpără" flow against the local dev server.
// Phase 1 (must-have): open a listing, click Cumpără, confirm redirect to
// Stripe-hosted Checkout. Phase 2 (best-effort): pay with the 4242 test card
// and confirm we land on /checkout/success.
import { chromium, devices } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = './_shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext(devices['iPhone 13']);
const page = await ctx.newPage();

await page.goto(`${BASE}/`, { waitUntil: 'load' });
await page.waitForTimeout(4000);
const href = await page.locator('a[href^="/listings/"]').first().getAttribute('href');
console.log('listing:', href);
await page.goto(`${BASE}${href}`, { waitUntil: 'load' });
await page.waitForTimeout(4000);

await page.getByRole('button', { name: /Cumpără/ }).click();

// Phase 1: redirect to Stripe Checkout
await page.waitForURL(/checkout\.stripe\.com/, { timeout: 40000 });
console.log('CHECKOUT_URL:', page.url());
await page.waitForTimeout(5000);
await page.screenshot({ path: `${OUT}/stripe_checkout.png` });

// Phase 2: fill the test card (best-effort; Stripe inputs need keystrokes)
try {
  await page.locator('#email').fill('test@craftology.ro');
  await page.locator('#cardNumber').pressSequentially('4242424242424242', { delay: 40 });
  await page.locator('#cardExpiry').pressSequentially('1234', { delay: 40 });
  await page.locator('#cardCvc').pressSequentially('123', { delay: 40 });
  await page.locator('#billingName').fill('Test Cumparator');
  const postal = page.locator('#billingPostalCode');
  if (await postal.count()) await postal.fill('010101');
  await page.locator('.SubmitButton, button[type=submit]').first().click();
  await page.waitForURL(/checkout\/success/, { timeout: 60000 });
  console.log('SUCCESS_URL:', page.url());
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/checkout_success.png` });
  console.log('PHASE2_OK');
} catch (e) {
  console.log('PHASE2_NOTE:', e.message.split('\n')[0]);
}

await browser.close();
console.log('DONE');
