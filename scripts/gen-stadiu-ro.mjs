// One-off: render the current Romanian project-status PDF to the Desktop.
import { chromium } from 'playwright';
const today = new Date().toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });

const CSS = `
  *{box-sizing:border-box}
  body{font-family:"Segoe UI",system-ui,sans-serif;color:#2a211a;margin:0;font-size:12px;line-height:1.5}
  .wrap{padding:44px 50px}
  h1{font-family:Georgia,serif;font-size:27px;margin:0 0 2px;letter-spacing:-.01em}
  .sub{color:#6f6153;font-size:12px;margin:0 0 4px}
  .eyebrow{text-transform:uppercase;letter-spacing:.22em;font-size:9.5px;color:#b9572f;font-weight:700}
  .rule{height:2px;background:repeating-linear-gradient(90deg,#d8c9ad 0 6px,transparent 6px 12px);margin:13px 0 20px}
  h2{font-family:Georgia,serif;font-size:15.5px;margin:20px 0 7px;border-left:3px solid #b9572f;padding-left:10px}
  p{margin:0 0 8px} ul{margin:0 0 8px;padding-left:18px} li{margin:0 0 5px}
  .card{border:1.5px solid #d8c9ad;border-radius:11px;background:#fffdf7;box-shadow:4px 4px 0 0 #ddcdb0;padding:12px 15px;margin:0 0 14px}
  .alert{border:1.5px solid #b9572f;border-radius:11px;background:#f7e9df;box-shadow:4px 4px 0 0 #e4c9b6;padding:12px 15px;margin:0 0 14px}
  .alert b{color:#984427}
  .todo{background:#f7efe0;border:1.5px solid #d8c9ad;border-radius:9px;padding:9px 13px;margin:7px 0}
  .todo b{color:#984427}
  .good{color:#6c7355;font-weight:600}
  .foot{margin-top:24px;padding-top:12px;border-top:1px solid #e7dcc8;color:#6f6153;font-size:10.5px}
  .lead{font-size:13px}
`;

const HTML = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="wrap">
  <p class="eyebrow">Craft'zaar · Deco Kubik SRL</p>
  <h1>Stadiul platformei</h1>
  <p class="sub">Pregătit ${today}</p>
  <div class="rule"></div>
  <p class="lead">Platforma este funcțională și publicată (găzduită în Uniunea Europeană). Aplicația a fost redenumită complet în <b>Craft'zaar</b>, iar documentele legale de la avocată au fost integrate și standardizate. Comisionul a fost setat la <b>10%</b> (conform Acordului Vânzătorului). Mai jos: ce este gata și ce mai rămâne.</p>

  <h2>Ce este gata (funcțional)</h2>
  <div class="card"><ul>
    <li><b>Catalog</b> cu categoriile Accesorii / Haine / Home și subcategorii (fără cosmetice sau alimente — doar handmade).</li>
    <li><b>Cont de vânzător:</b> cerere → aprobare manuală → configurare Stripe → publicare produse. Vânzătorii noi: maximum 20 de produse până la prima vânzare.</li>
    <li><b>Plăți prin Stripe:</b> vânzătorul este comerciantul; banii ajung în contul lui, comisionul platformei (10%) se reține automat; adresa de livrare se colectează la plată și ajunge la vânzător.</li>
    <li><b>Comenzi + anulare/rambursare:</b> pot anula cumpărătorul, vânzătorul și administratorul → rambursare integrală prin Stripe, iar produsul revine la vânzare.</li>
    <li><b>Recenzii</b> (doar după o achiziție reală), <b>raportare</b> produse/vânzători, <b>urmărește artizan</b>.</li>
    <li><b>Închiderea contului de vânzător</b> — blocată dacă are comenzi în curs.</li>
    <li><b>Mesagerie</b> directă cumpărător–vânzător.</li>
    <li><b>Panou de administrare</b> dedicat: vânzători, sesizări, comenzi și statistici.</li>
  </ul></div>

  <h2>Documente legale (de la avocată)</h2>
  <div class="card"><ul>
    <li>Integrate în aplicație, text complet și exact: <b>Politica de Confidențialitate</b>, <b>Termeni și Condiții</b>, <b>Acordul Vânzătorului</b>.</li>
    <li>Standardizate: brand Craft'zaar peste tot, email info.craftology.shop@gmail.com, adresă „str Odobești 13, blv 35/60", data „2 iulie 2026".</li>
    <li>Vizibile la /privacy, /terms, /seller-agreement; legate din formularul de înscriere vânzător și din subsolul paginii.</li>
  </ul></div>

  <h2>Securitate</h2>
  <p class="good">Cod verificat (audit intern adversarial), reguli de acces (RLS) întărite pe toate tabelele, funcții de bază de date securizate. Baza de date este în UE (Irlanda).</p>

  <h2>Ce mai rămâne — pentru avocată</h2>
  <div class="todo"><b>Lipsesc două documente</b> menționate în Termeni și în Politica de Confidențialitate, dar netrimise încă: <b>Politica de Retururi și Rambursări</b> și <b>Politica de Cookie-uri</b>. (Numele, emailul, adresa și comisionul de 10% sunt deja corelate în aplicație.)</div>

  <h2>Ce mai rămâne — pentru tine (setări)</h2>
  <div class="todo"><b>Stripe (înainte de vânzări reale):</b> pe webhook, activează evenimentele pentru conturile conectate și evenimentul <b>charge.refunded</b> — fără acestea, comenzile de la vânzători și rambursările nu se înregistrează automat.</div>
  <div class="todo"><b>Produse demo:</b> de înlocuit cu produse reale ale artizanilor la lansare.</div>
  <div class="todo"><b>Opțional:</b> plan Supabase Pro (protecție împotriva parolelor compromise). Regiunea bazei de date este deja în UE — corect.</div>

  <p class="foot">Aplicație live: craftology-peach.vercel.app · Contact: info.craftology.shop@gmail.com · Găzduire în UE (Irlanda). Când avocata trimite documentele corectate + cele două politici lipsă, se integrează la fel, verbatim.</p>
</div></body></html>`;

const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(HTML, { waitUntil: 'networkidle' });
await p.pdf({ path: 'C:/Users/ribbon/Desktop/Craftzaar-Stadiu-RO.pdf', format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
await b.close();
console.log('done');
