// Throwaway design-audit helper: screenshots key screens at phone + desktop
// sizes into .design-audit/. Usage: node scripts/design-audit.mjs [suffix]
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000';
const suffix = process.argv[2] ? `-${process.argv[2]}` : '';
const outDir = '.design-audit';
mkdirSync(outDir, { recursive: true });

const shots = [
  { name: 'home', path: '/' },
  { name: 'search', path: '/search' },
  { name: 'messages', path: '/messages' },
  { name: 'profile', path: '/profile' },
  { name: 'sell', path: '/sell' },
  { name: 'terms', path: '/terms' },
];

const browser = await chromium.launch();

async function capture(ctx, label, dark = false) {
  const page = await ctx.newPage();
  if (dark) {
    await page.addInitScript(() => localStorage.setItem('craftology-theme', 'dark'));
  }
  for (const s of shots) {
    try {
      await page.goto(BASE + s.path, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${outDir}/${s.name}-${label}${suffix}.png`, fullPage: s.name !== 'messages' });
    } catch (e) {
      console.error(`${s.name}-${label}: ${e.message.split('\n')[0]}`);
    }
  }
  // Listing detail: follow the first card on home
  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    const href = await page.locator('a[href^="/listings/"]').first().getAttribute('href');
    if (href) {
      await page.goto(BASE + href, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${outDir}/listing-${label}${suffix}.png`, fullPage: true });
    }
  } catch (e) {
    console.error(`listing-${label}: ${e.message.split('\n')[0]}`);
  }
  // Auth modal
  try {
    await page.goto(BASE + '/', { waitUntil: 'load', timeout: 45000 });
    await page.getByRole('button', { name: /Conectează-te/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${outDir}/auth-modal-${label}${suffix}.png` });
  } catch (e) {
    console.error(`auth-modal-${label}: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}

// Phone (iPhone 13-ish)
const phone = await browser.newContext({ ...devices['iPhone 13'] });
await capture(phone, 'phone');
await phone.close();

// Desktop
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await capture(desktop, 'desktop');
await desktop.close();

// Phone dark
const phoneDark = await browser.newContext({ ...devices['iPhone 13'] });
await capture(phoneDark, 'phone-dark', true);
await phoneDark.close();

await browser.close();
console.log('done');
