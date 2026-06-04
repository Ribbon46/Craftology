// Render docs/PLAN-MARKETPLACE-RO.md to a styled PDF (Playwright) + Word .docx
// (html-to-docx), into the user's Downloads folder.
import { readFileSync, writeFileSync } from 'node:fs';
import { marked } from 'marked';
import HTMLtoDOCX from 'html-to-docx';
import { chromium } from 'playwright';

const SRC = 'I:/craftology/docs/PLAN-MARKETPLACE-RO.md';
const OUT_DIR = 'C:/Users/ribbon/Downloads';
const BASE = 'Plan-Marketplace-DecoKubik';

const md = readFileSync(SRC, 'utf8');
const body = marked.parse(md);

const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Calibri, 'Helvetica Neue', Arial, sans-serif;
         color: #2a211a; line-height: 1.55; font-size: 11.5pt; }
  h1 { font-size: 23pt; color: #984427; margin: 0 0 .3em; line-height: 1.15; }
  h2 { font-size: 15pt; color: #b9572f; margin: 1.4em 0 .4em;
       border-bottom: 2px solid #e7dcc8; padding-bottom: .2em; }
  h3 { font-size: 12.5pt; color: #2a211a; margin: 1em 0 .3em; }
  p, li { font-size: 11.5pt; }
  a { color: #b9572f; }
  blockquote { border-left: 3px solid #d8c9ad; margin: .8em 0; padding: .2em 1em;
               background: #f6f0e4; color: #4a3f33; }
  table { border-collapse: collapse; width: 100%; margin: .8em 0; }
  th, td { border: 1px solid #d8c9ad; padding: 7px 10px; text-align: left;
           vertical-align: top; font-size: 11pt; }
  th { background: #efe7d6; color: #2a211a; }
  code { background: #efe7d6; padding: 1px 4px; border-radius: 3px; font-size: 10.5pt; }
  hr { border: none; border-top: 1px solid #e7dcc8; margin: 1.5em 0; }
  strong { color: #2a211a; }
</style></head><body>${body}</body></html>`;

// ── PDF ──
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: `${OUT_DIR}/${BASE}.pdf`,
  format: 'A4',
  printBackground: true,
  margin: { top: '18mm', bottom: '18mm', left: '16mm', right: '16mm' },
});
await browser.close();

// ── DOCX ──
const docx = await HTMLtoDOCX(html, null, {
  table: { row: { cantSplit: true } },
  footer: false,
  pageNumber: false,
  font: 'Calibri',
  fontSize: 22, // half-points → 11pt
});
writeFileSync(`${OUT_DIR}/${BASE}.docx`, docx);

console.log(`Wrote:\n  ${OUT_DIR}/${BASE}.pdf\n  ${OUT_DIR}/${BASE}.docx`);
