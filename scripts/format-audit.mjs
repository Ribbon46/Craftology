import { readFileSync } from 'node:fs';

const path = process.argv[2];
const raw = readFileSync(path, 'utf8').trim();
const outer = JSON.parse(raw);
const data = outer.result ?? outer;

const sevRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const fmt = (list, header) => {
  console.log(`\n\n========== ${header} (${list.length}) ==========`);
  list
    .slice()
    .sort((a, b) => (sevRank[a.severity] ?? 9) - (sevRank[b.severity] ?? 9))
    .forEach((f, i) => {
      console.log(`\n[${i + 1}] (${f.severity.toUpperCase()}) ${f.title}`);
      console.log(`    where: ${f.file} :: ${f.location}`);
      console.log(`    impact: ${f.impact}`);
      console.log(`    fix: ${f.fix}`);
    });
};

console.log('TOTALS:', JSON.stringify(data.totals));
fmt(data.confirmed || [], 'CONFIRMED');
fmt(data.likely || [], 'LIKELY');
console.log('\n\n========== REFUTED ==========');
(data.refuted || []).forEach((f) => console.log(`- (${f.severity}) ${f.title}`));
