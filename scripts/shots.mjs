import { chromium, devices } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:3000';
const OUT = './_shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shot(name, contextOpts, path, { fullPage = false, wait = 4000 } = {}) {
  const ctx = await browser.newContext(contextOpts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage });
  await ctx.close();
  console.log('shot', name);
}

const iphone = devices['iPhone 13'];
const desktop = { viewport: { width: 1440, height: 960 } };

// Mobile (true device emulation)
await shot('m_home', iphone, '/');
await shot('m_search', iphone, '/search');
await shot('m_sell', iphone, '/sell');
await shot('m_profile', iphone, '/profile');

// Listing detail — discover a real listing href from the feed
{
  const ctx = await browser.newContext(iphone);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load' });
  await page.waitForTimeout(4000);
  const href = await page.locator('a[href^="/listings/"]').first().getAttribute('href').catch(() => null);
  if (href) {
    await page.goto(`${BASE}${href}`, { waitUntil: 'load' });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `${OUT}/m_detail.png` });
    console.log('shot m_detail', href);
  } else {
    console.log('no listing href found');
  }
  await ctx.close();
}

// Desktop framing
await shot('d_home', desktop, '/');

await browser.close();
console.log('ALL DONE');
