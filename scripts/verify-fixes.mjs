// Throwaway verification for the two reported bugs:
// 1) Auth modal must close when tapping Termenii / Politica links.
// 2) Liquid-glass pill must NOT animate position on first load (no fly-in),
//    but must still slide when switching tabs.
import { chromium, devices } from 'playwright';

const BASE = process.env.AUDIT_BASE ?? 'http://localhost:3000';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
};

// --- 1) Auth modal closes on legal links ---
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.getByRole('button', { name: /Conectează-te/i }).click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.getByRole('link', { name: 'Termenii' }).click();
await page.waitForURL('**/terms');
const dialogGone = await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 2500 }).then(() => true).catch(() => false);
check('modal closes on Termenii link', dialogGone, `url=${page.url()}`);

await page.goto(BASE + '/', { waitUntil: 'load' });
await page.getByRole('button', { name: /Conectează-te/i }).click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.getByRole('link', { name: 'Politica de confidențialitate' }).click();
await page.waitForURL('**/privacy');
const dialogGone2 = await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 2500 }).then(() => true).catch(() => false);
check('modal closes on Politica link', dialogGone2, `url=${page.url()}`);

// --- 2) Pill: no movement transition on first paint ---
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.waitForTimeout(400);
// Bottom-nav pill: the aria-hidden span inside the fixed bottom tab bar
// (NOT the desktop header nav pill, which is display:none on phones).
const pill = page.locator('nav.fixed span[aria-hidden]').first();
const t0 = await pill.evaluate((el) => ({
  transition: el.style.transition,
  left: el.style.left,
  width: el.style.width,
  opacity: getComputedStyle(el).opacity,
}));
check('pill visible after load', Number(t0.opacity) > 0.9, `opacity=${t0.opacity}`);
check('pill has NO left/width transition on first paint', !t0.transition.includes('left'), `transition="${t0.transition}"`);
check('pill positioned (not at 0/negative width)', parseFloat(t0.width) > 10, `left=${t0.left} width=${t0.width}`);

// Position must be stable (no late jump)
const p1 = await pill.boundingBox();
await page.waitForTimeout(700);
const p2 = await pill.boundingBox();
check('pill position stable after load', Math.abs(p1.x - p2.x) < 1 && Math.abs(p1.width - p2.width) < 1,
  `x ${p1.x}→${p2.x}, w ${p1.width}→${p2.width}`);

// Switching tabs DOES animate (transition re-enabled)
await page.locator('nav.fixed a[href="/search"]').click();
await page.waitForTimeout(250);
const t1 = await pill.evaluate((el) => el.style.transition);
check('pill animates on tab switch', t1.includes('left'), `transition="${t1}"`);

// Category chips pill: same first-paint rule
await page.goto(BASE + '/search', { waitUntil: 'load' });
await page.waitForTimeout(400);
const chipPill = page.locator('div.relative.flex > span[aria-hidden]').first();
const c0 = await chipPill.evaluate((el) => ({ transition: el.style.transition, width: el.style.width }));
check('chips pill: no movement transition on first paint', !c0.transition.includes('left'), `transition="${c0.transition}"`);
check('chips pill positioned', parseFloat(c0.width) > 10, `width=${c0.width}`);

await browser.close();
console.log(failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
