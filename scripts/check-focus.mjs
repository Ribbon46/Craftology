// Deep debug: find the compiled focus-visible:ring-3 rule, check whether it
// matches the focused button, and read the --tw-* vars it should set.
import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const page = await (await browser.newContext({ ...devices['iPhone 13'] })).newPage();
await page.goto('http://localhost:3000/', { waitUntil: 'load' });
await page.getByRole('button', { name: /Conectează-te/i }).click();
await page.getByRole('dialog').waitFor({ state: 'visible' });
await page.getByPlaceholder('••••••••').click();
await page.keyboard.press('Tab');
await page.keyboard.press('Tab');
// transition-all duration-200 — let the focus styles settle before reading
await page.waitForTimeout(400);

const info = await page.evaluate(() => {
  const el = document.activeElement;
  const cs = getComputedStyle(el);
  const rules = [];
  for (const sheet of document.styleSheets) {
    let list;
    try { list = sheet.cssRules; } catch { continue; }
    const walk = (rs) => {
      for (const r of rs) {
        if (r.cssRules) walk(r.cssRules);
        if (r.selectorText && r.selectorText.includes('focus-visible\\:ring-3')) {
          let matches = false;
          try { matches = el.matches(r.selectorText); } catch {}
          rules.push({ sel: r.selectorText, css: r.style?.cssText?.slice(0, 200), matches, parent: r.parentRule?.cssText?.slice(0, 60) ?? null });
        }
      }
    };
    walk(list);
  }
  return {
    name: el?.textContent?.trim(),
    focusVisible: el.matches(':focus-visible'),
    ringShadowVar: cs.getPropertyValue('--tw-ring-shadow'),
    shadowVar: cs.getPropertyValue('--tw-shadow'),
    ringColorVar: cs.getPropertyValue('--tw-ring-color'),
    boxShadow: cs.boxShadow,
    borderColor: cs.borderColor,
    ringRules: rules,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
