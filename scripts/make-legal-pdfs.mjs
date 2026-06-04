// Render each legal draft (docs/legal/*.md) to its own styled PDF in
// Downloads/Craftology-Legal/. PDFs only — no other file types in that folder.
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { marked } from 'marked';
import { chromium } from 'playwright';

const SRC_DIR = 'I:/craftology/docs/legal';
const OUT_DIR = 'C:/Users/ribbon/Downloads/Craftology-Legal';

// Start clean so the folder only ever contains the generated PDFs.
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const STYLE = `<style>
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; color: #2a211a; line-height: 1.55; font-size: 11.5pt; }
  h1 { font-size: 22pt; color: #984427; margin: 0 0 .3em; line-height: 1.15; }
  h2 { font-size: 14pt; color: #b9572f; margin: 1.3em 0 .4em; border-bottom: 2px solid #e7dcc8; padding-bottom: .2em; }
  h3 { font-size: 12pt; margin: 1em 0 .3em; }
  blockquote { border-left: 3px solid #d8c9ad; margin: .8em 0; padding: .3em 1em; background: #f6f0e4; color: #4a3f33; }
  table { border-collapse: collapse; width: 100%; margin: .8em 0; }
  th, td { border: 1px solid #d8c9ad; padding: 6px 9px; text-align: left; vertical-align: top; font-size: 10.5pt; }
  th { background: #efe7d6; }
  code { background: #efe7d6; padding: 1px 4px; border-radius: 3px; font-size: 10pt; }
  a { color: #b9572f; }
  hr { border: none; border-top: 1px solid #e7dcc8; margin: 1.4em 0; }
</style>`;

const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.md')).sort();
const browser = await chromium.launch();
const page = await browser.newPage();

for (const f of files) {
  const md = readFileSync(`${SRC_DIR}/${f}`, 'utf8');
  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8">${STYLE}</head><body>${marked.parse(md)}</body></html>`;
  await page.setContent(html, { waitUntil: 'load' });
  const out = `${OUT_DIR}/${f.replace(/\.md$/, '.pdf')}`;
  await page.pdf({ path: out, format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' } });
  console.log('wrote', out);
}

await browser.close();
console.log('done →', OUT_DIR);
