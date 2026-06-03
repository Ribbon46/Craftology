import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.SHOT_BASE || 'https://craftology-peach.vercel.app';
const OUT = './_shots';
fs.mkdirSync(OUT, { recursive: true });

const sizes = [
  { name: 'small_360', w: 360, h: 780 },
  { name: 'large_412', w: 412, h: 900 },
  { name: 'tablet_768', w: 768, h: 1024 },
];

const browser = await chromium.launch();
for (const s of sizes) {
  const ctx = await browser.newContext({
    viewport: { width: s.w, height: s.h },
    isMobile: true,
    deviceScaleFactor: 2,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${OUT}/r_${s.name}.png` });
  await ctx.close();
  console.log('shot', s.name);
}
await browser.close();
console.log('DONE');
