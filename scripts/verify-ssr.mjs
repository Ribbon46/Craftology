// Check for hydration errors + that interactivity survives the SSR split.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = 'I:/craftology/_verify';
mkdirSync(OUT, { recursive: true });
const ID = 'a88405d4-bba9-41c0-9aab-c7bc5955c673';

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'] });
const page = await ctx.newPage();

const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 200)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 200)));

// Home — hydration + category switch
await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/ssr-home.png` });
const before = await page.locator('a[href^="/listings/"]').count();
// Switch category to Bijuterii and confirm the feed re-renders (interactivity).
try {
  await page.getByRole('button', { name: 'Bijuterii' }).click({ timeout: 4000 });
  await page.waitForTimeout(1200);
} catch (e) { errors.push('category click: ' + e.message); }
const after = await page.locator('a[href^="/listings/"]').count();

// Detail — SSR + interactivity present
await page.goto(`${BASE}/listings/${ID}`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/ssr-detail.png` });
const hasBuy = await page.getByRole('button', { name: /Cump/ }).count();

await browser.close();
console.log('cards before category switch:', before, '| after Bijuterii:', after);
console.log('detail Buy button present:', hasBuy > 0);
console.log('hydration/JS errors:', errors.length ? errors : 'NONE');
console.log('done');
