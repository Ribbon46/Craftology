import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('.design-audit', { recursive: true });
const b = await chromium.launch();
const p = await (await b.newContext({ ...devices['iPhone 13'] })).newPage();
for (const [route, name] of [['/terms', 'terms'], ['/seller-agreement', 'acord'], ['/privacy', 'privacy']]) {
  await p.goto('http://localhost:3000' + route, { waitUntil: 'load', timeout: 45000 });
  await p.waitForTimeout(700);
  // count rendered blocks + grab a text sample to confirm no truncation
  const info = await p.evaluate(() => {
    const main = document.querySelector('div.space-y-3\\.5');
    return {
      h2: document.querySelectorAll('h2').length,
      p: main ? main.querySelectorAll('p').length : 0,
      li: document.querySelectorAll('li').length,
      lastText: (main?.lastElementChild?.textContent || '').slice(-80),
    };
  });
  console.log(`${name}: h2=${info.h2} p=${info.p} li=${info.li} | ends: "${info.lastText}"`);
  await p.screenshot({ path: `.design-audit/legal-${name}.png`, fullPage: name !== 'terms' });
}
// terms is long — capture just the top viewport for a readability check
await p.goto('http://localhost:3000/terms', { waitUntil: 'load' });
await p.waitForTimeout(600);
await p.screenshot({ path: '.design-audit/legal-terms-top.png' });
await b.close();
console.log('done');
