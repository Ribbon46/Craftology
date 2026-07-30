import { chromium } from 'playwright';
const CSS = `
  *{box-sizing:border-box} body{font-family:"Segoe UI",system-ui,sans-serif;color:#2a211a;margin:0;font-size:11px;line-height:1.5}
  .wrap{padding:38px 46px}
  h1{font-family:Georgia,serif;font-size:25px;margin:0 0 2px} .sub{color:#6f6153;font-size:11.5px;margin:0 0 4px}
  .eyebrow{text-transform:uppercase;letter-spacing:.22em;font-size:9px;color:#b9572f;font-weight:700}
  .rule{height:2px;background:repeating-linear-gradient(90deg,#d8c9ad 0 6px,transparent 6px 12px);margin:11px 0 16px}
  h2{font-family:Georgia,serif;font-size:14.5px;margin:16px 0 6px;border-left:3px solid #b9572f;padding-left:10px}
  p{margin:0 0 7px} ul{margin:0 0 7px;padding-left:18px} li{margin:0 0 4px}
  .card{border:1.5px solid #d8c9ad;border-radius:11px;background:#fffdf7;box-shadow:4px 4px 0 0 #ddcdb0;padding:10px 14px;margin:0 0 12px}
  .ok li{list-style:none;position:relative;padding-left:19px} .ok li:before{content:"✓";position:absolute;left:0;color:#6c7355;font-weight:700}
  .todo{background:#f7efe0;border:1.5px solid #d8c9ad;border-radius:9px;padding:8px 12px;margin:6px 0} .todo b{color:#984427}
  .ask{background:#eef1e7;border:1.5px solid #cdd6bd;border-radius:11px;padding:11px 14px;margin:8px 0} .ask b{color:#5c6a3f}
  .foot{margin-top:18px;padding-top:10px;border-top:1px solid #e7dcc8;color:#6f6153;font-size:9.5px}
`;
const HTML = `<!doctype html><html lang="ro"><head><meta charset="utf-8"><style>${CSS}</style></head><body><div class="wrap">
  <p class="eyebrow">Craft'zaar · Deco Kubik SRL</p>
  <h1>Stadiul platformei — gata de lansare</h1>
  <p class="sub">Actualizat 4 iulie 2026</p>
  <div class="rule"></div>
  <p><b>Platforma este funcțională cap-coadă și verificată.</b> Am rulat un audit complet (35 de teste automate pe site-ul live + analiză de cod) și am reparat tot ce s-a găsit — inclusiv o eroare critică ce bloca publicarea produselor. Cu pasul Stripe finalizat, vânzătorii se pot înscrie complet.</p>

  <h2>Ce s-a reparat la audit</h2>
  <div class="card"><ul class="ok">
    <li><b>Publicarea produselor era blocată</b> de o eroare tehnică (orice „Publică produsul" eșua). Reparată și verificată live: produsul apare pe prima pagină imediat. <b>Se pot adăuga produse acum!</b></li>
    <li>Produsele vândute apar acum ca „Vândut" (butonul de cumpărare se dezactivează).</li>
    <li>Pagina de confirmare a comenzii afișează mereu butonul de retur (și pentru clienții cu cont, și pentru vizitatori).</li>
    <li>Vânzătorii își pot <b>șterge propriile produse</b> (buton „Șterge" în Profil, cu confirmare).</li>
    <li>Sesiunile de plată expiră în 30 min — protecție ca două persoane să nu cumpere același produs unicat.</li>
    <li>Mesaje clare la înregistrare cu email deja folosit și la linkuri de confirmare expirate.</li>
  </ul></div>

  <h2>Cerințele tale — toate implementate</h2>
  <div class="card"><ul class="ok">
    <li>Slogan nou: „Produse handmade de la creatori români verificați — fiecare produs este lucrat cu pasiune."</li>
    <li>Subsol: fraza se termină la „verificați"; „© 2026 Craft'zaar este o marcă comercială a Deco Kubik SRL · CUI RO24386414 · info.craftology.shop@gmail.com".</li>
    <li>Buton mare, clar: <b>„Retur / Renunțare la achiziție"</b> + formular de retragere (OUG 34/2014) în cont și pe pagina comenzii.</li>
    <li>Buton „Ajutor" pe fiecare pagină: răspunsuri rapide (robotel) + <b>WhatsApp</b> (0732 781 226) + email.</li>
    <li>Ecusoanele <b>ANPC–SAL și SOL</b> + simbolurile Visa / Mastercard / Stripe în subsol.</li>
    <li>Linkurile legale se văd acum și <b>pe telefon</b> în subsol.</li>
    <li>Pe prima pagină: secțiunea „Adăugate recent" + ghidul în 5 pași „Devino vânzător".</li>
    <li>Vizitatorii pot contacta vânzătorul fără cont (email/telefon pe pagina produsului).</li>
    <li>QR de distribuire + banner de instalare pe Android + banner cookie-uri conform Politicii.</li>
    <li>Toate cele 5 documente legale de la avocată, integrate complet.</li>
  </ul></div>

  <h2>Ce înseamnă pasul Stripe (explicație)</h2>
  <div class="ask">
    <p><b>Cele două „Acknowledge" din Stripe</b> sunt două confirmări simple prin care Deco Kubik (ca operator al platformei) confirmă că a înțeles împărțirea responsabilităților cu Stripe:</p>
    <p>1. <b>Solduri negative:</b> dacă un vânzător ajunge cu contul pe minus (ex. rambursări mai mari decât încasările), <b>Stripe</b> acoperă riscul — nu Deco Kubik.</p>
    <p>2. <b>Conformitatea vânzătorilor:</b> verificarea identității (KYC), monitorizarea și cerințele legale ale vânzătorilor sunt gestionate de <b>Stripe</b>, nu de noi.</p>
    <p>Ambele sunt varianta <b>favorabilă</b> pentru noi: Stripe își asumă riscul și birocrația. După confirmare, vânzătorii își pot conecta conturile de plată și pot încasa bani.</p>
  </div>

  <h2>Rămase (neblocante)</h2>
  <div class="todo"><b>Wishlist (favorite)</b> pentru utilizatorii înregistrați — următoarea funcționalitate planificată.</div>
  <div class="todo"><b>Livrabilitate email:</b> emailurile pot ajunge în Spam (Gmail ca expeditor). Soluția definitivă: domeniu propriu (~12 €/an) + serviciu dedicat (gratuit la volumul actual).</div>
  <div class="todo">Îmbunătățiri minore planificate: reîmprospătare automată în chat, rambursare automată la vânzare dublă (fereastra e deja redusă la 30 min).</div>

  <p class="foot">craftology-peach.vercel.app · info.craftology.shop@gmail.com · Găzduire UE (Irlanda) · Comision 10% · Admin: atelier@decokubik.ro · Verificat prin 35 de teste automate pe site-ul live.</p>
</div></body></html>`;
const b = await chromium.launch();
const p = await b.newPage();
await p.setContent(HTML, { waitUntil: 'networkidle' });
await p.pdf({ path: 'C:/Users/ribbon/Desktop/Craftzaar-Stadiu-RO.pdf', format: 'A4', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
await b.close();
console.log('done');
