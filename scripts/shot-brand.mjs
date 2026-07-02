import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('.design-audit', { recursive: true });
const b = await chromium.launch();
// Home header (phone)
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'load', timeout: 45000 });
await p.waitForTimeout(900);
await p.screenshot({ path: '.design-audit/brand-home.png' });
const brand = await p.evaluate(() => document.querySelector('header a span')?.textContent);
console.log('header brand:', brand);
// OG image
await p.goto('http://localhost:3000/opengraph-image', { waitUntil: 'load', timeout: 45000 });
await p.waitForTimeout(500);
await p.screenshot({ path: '.design-audit/brand-og.png' });
await b.close();
console.log('done');
