// Visual verification: light/dark × phone/desktop, plus the auth modal footer fix.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE || 'http://localhost:3210';
const OUT = 'I:/craftology/_verify';
mkdirSync(OUT, { recursive: true });

async function waitForServer(page) {
  for (let i = 0; i < 40; i++) {
    try {
      await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 3000 });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error('server never came up');
}

const browser = await chromium.launch();

// ---- readiness ----
{
  const p = await browser.newPage();
  await waitForServer(p);
  await p.close();
}

const cases = [
  { name: 'desktop', opts: { viewport: { width: 1440, height: 900 } } },
  { name: 'phone', opts: { ...devices['Pixel 7'] } },
];

for (const c of cases) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext(c.opts);
    if (theme === 'dark') {
      await ctx.addInitScript(() => localStorage.setItem('craftology-theme', 'dark'));
    } else {
      await ctx.addInitScript(() => localStorage.setItem('craftology-theme', 'light'));
    }
    const page = await ctx.newPage();

    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/${c.name}-${theme}-home.png`, fullPage: false });

    // Open the auth modal via the dedicated header button.
    try {
      await page.getByRole('button', { name: 'Conectează-te' }).first().click({ timeout: 4000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${OUT}/${c.name}-${theme}-authmodal.png`, fullPage: false });
    } catch (e) {
      console.log(`[${c.name}/${theme}] auth modal:`, e.message);
    }

    await ctx.close();
  }
}

await browser.close();
console.log('done →', OUT);
