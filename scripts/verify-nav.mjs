// Confirm the liquid-glass nav pill sits under the active item across routes.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = 'I:/craftology/_verify';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function ready(page) {
  for (let i = 0; i < 40; i++) {
    try { await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 3000 }); return; }
    catch { await new Promise((r) => setTimeout(r, 1000)); }
  }
  throw new Error('server down');
}
{ const p = await browser.newPage(); await ready(p); await p.close(); }

for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 320 } });
  await ctx.addInitScript((t) => localStorage.setItem('craftology-theme', t), theme);
  const page = await ctx.newPage();
  for (const [route, name] of [['/', 'home'], ['/search', 'search'], ['/messages', 'messages']]) {
    await page.goto(BASE + route, { waitUntil: 'networkidle' });
    await page.waitForTimeout(900); // let the pill settle/animate
    // crop to the header strip
    await page.screenshot({ path: `${OUT}/nav-${theme}-${name}.png`, clip: { x: 0, y: 0, width: 1440, height: 80 } });
  }
  await ctx.close();
}

await browser.close();
console.log('done →', OUT);
