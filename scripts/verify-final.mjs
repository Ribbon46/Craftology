// Verify next/image rendering + the liquid-glass indicators across surfaces.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = 'I:/craftology/_verify';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const imgFailures = [];

async function ready(page) {
  for (let i = 0; i < 40; i++) {
    try { await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 3000 }); return; }
    catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error('server down');
}
{ const p = await browser.newPage(); await ready(p); await p.close(); }

async function shoot(ctx, label) {
  const page = await ctx.newPage();
  page.on('response', (r) => {
    if (r.url().includes('/_next/image') && r.status() >= 400) imgFailures.push(`${label}: ${r.status()} ${r.url().slice(0, 120)}`);
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${label}-home.png` });

  // Open a real listing by clicking the first product card.
  try {
    await page.locator('a[href^="/listings/"]').first().click({ timeout: 5000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${OUT}/${label}-detail.png` });
  } catch (e) {
    console.log(`${label} detail: ${e.message}`);
  }

  await page.goto(BASE + '/search', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${OUT}/${label}-search.png` });
  await page.close();
}

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ ...devices['Pixel 7'] });
  await ctx.addInitScript((t) => localStorage.setItem('craftology-theme', t), theme);
  await shoot(ctx, `phone-${theme}`);
  await ctx.close();
}
// desktop light (nav pill + grid images)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => localStorage.setItem('craftology-theme', 'light'));
  await shoot(ctx, 'desktop-light');
  await ctx.close();
}

await browser.close();
console.log('img optimizer failures:', imgFailures.length ? imgFailures : 'NONE');
console.log('done →', OUT);
