# Plan: Marketplace cu Vânzători Verificați — Deco Kubik (Faza 2)

> **Pentru:** Deco Kubik (proprietar)
> **Scop:** să transformăm aplicația dintr-un magazin cu un singur vânzător într-un
> **marketplace** unde mai mulți creatori *verificați* își pot vinde produsele
> handmade, iar tu reții un **comision de 10%** din fiecare vânzare.
> **Statusul actual:** aplicația e funcțională și live; aceasta e o *ciornă* de plan.
> Citește-o, răspunde la întrebările din secțiunea **„Ce trebuie să decizi"** și
> putem începe implementarea.

---

## 1. Pe scurt (rezumat)

| | Acum (Faza 1) | După (Faza 2) |
|---|---|---|
| Cine vinde | Doar Deco Kubik | Mai mulți vânzători verificați |
| Unde merg banii | În contul tău Stripe | **Direct** în contul fiecărui vânzător |
| Ce primești tu | 100% (e magazinul tău) | **Comision 10%** din fiecare vânzare, automat |
| Verificare vânzători | — | Tu aprobi + Stripe verifică identitatea |
| Plăți / facturi | Tu | Stripe plătește vânzătorii; tu facturezi doar comisionul |

Pe scurt: **tu devii „gazda" pieței**, nu mai ții tu banii altora. Stripe se ocupă
de plăți, verificare de identitate și de virarea banilor către vânzători. Tu
păstrezi automat 10% din fiecare comandă.

---

## 2. Cum devine cineva vânzător (verificarea)

Pașii prin care trece un creator nou:

1. **Cerere** — completează un formular în aplicație (nume, descrierea
   atelierului, link-uri / poze cu produsele, date de contact).
2. **Verificare** — tu (sau o persoană desemnată) te uiți peste cerere.
3. **Aprobare / respingere** — dintr-un panou simplu de administrare.
4. **Onboarding Stripe** — vânzătorul aprobat e trimis la un formular **găzduit
   de Stripe** unde își pune IBAN-ul și un act de identitate. Stripe verifică
   automat (KYC). Tu **nu** vezi și nu stochezi aceste date sensibile.
5. **Gata** — abia după ce Stripe confirmă, vânzătorul poate publica produse și
   poate încasa bani.

### Cât de strict verificăm? (alege o variantă)

- **Varianta A — recomandată (echilibrată):** tu aprobi manual fiecare cerere
  (te uiți la atelier/produse), iar Stripe verifică identitatea + IBAN-ul.
  *Avantaj:* control real asupra calității, fără bătăi de cap cu acte.
- **Varianta B — automată:** oricine trece de verificarea Stripe poate vinde,
  fără aprobarea ta. *Avantaj:* zero muncă pentru tine. *Dezavantaj:* nu
  controlezi calitatea/brandul.
- **Varianta C — strictă:** acte + portofoliu + eventual o discuție înainte de
  aprobare. *Avantaj:* calitate maximă. *Dezavantaj:* crește greu numărul de
  vânzători, mai multă muncă.

---

## 3. Comisionul (10%)

La fiecare vânzare, banii se împart **automat** de către Stripe:

| Preț produs | Primește vânzătorul (90%) | Primești tu (10%) |
|---|---|---|
| 50 lei | 45 lei | 5 lei |
| 120 lei | 108 lei | 12 lei |
| 250 lei | 225 lei | 25 lei |

> Notă: din suma totală se scad și **comisioanele Stripe** (aproximativ
> ~1,5% + o taxă mică pe tranzacție, plus mici costuri Connect). Trebuie să
> decidem **cine suportă** acest cost Stripe — vezi întrebarea 3 mai jos.

---

## 4. Cum primesc banii vânzătorii (Stripe Connect)

Folosim **Stripe Connect (conturi Express)** — standardul pentru marketplace-uri:

- Fiecare vânzător are **propriul cont Stripe**, conectat la platforma ta.
- La o comandă, clientul plătește o singură dată; Stripe **virează automat** 90%
  către vânzător și 10% către tine.
- Stripe **plătește vânzătorii** către IBAN-ul lor pe un program (ex. săptămânal)
  și se ocupă de verificarea de identitate (KYC) și de raportările lui.
- **Tu nu atingi niciodată banii altora** — ceea ce te scutește de o grămadă de
  obligații legale și fiscale (banii lor nu trec prin contul tău).

---

## 5. ✅ Ce trebuie să decizi (cel mai important)

Răspunde la întrebările de mai jos — pe baza lor construim. Am pus și o
**recomandare** la fiecare, ca să poți doar confirma dacă ești de acord.

1. **Nivel de verificare a vânzătorilor?**
   → *Recomandat: Varianta A (tu aprobi + Stripe verifică).*

2. **Comision?**
   → *Recomandat: 10% fix, la toate categoriile.* (Putem face diferit pe categorii dacă vrei.)

3. **Cine suportă comisionul Stripe (~1,5%)?**
   → *Recomandat: se scade din suma vânzătorului* (tu primești 10% „curat").
   Alternativă: îl absorbi tu din cei 10%, sau îl adaugi la prețul plătit de client.

4. **Cine gestionează retururile / reclamațiile?**
   → *Recomandat: vânzătorul răspunde de produs; tu mediezi doar la nevoie.*
   Trebuie scris clar în Termeni.

5. **Program de plată către vânzători?**
   → *Recomandat: săptămânal (programul standard Stripe).*

6. **Limite pentru vânzătorii noi?** (ex. câte produse poate lista la început)
   → *Recomandat: max. 10–20 produse până la prima vânzare reușită.*

7. **Ce categorii sunt permise?**
   → *Recomandat: aceleași 5 — Bijuterii, Haine, Lumânări, Accesorii, Frumusețe.*

8. **Facturare / taxe:** fiecare vânzător își emite factura lui către client?
   Tu emiți factură doar pentru comisionul de 10%?
   → *Recomandat: da la ambele.* **De confirmat cu un contabil.**

---

## 6. ⚖️ Aspecte legale (de citit cu atenție)

Trecerea la marketplace are implicații legale reale. Am pregătit ciorne, dar
**trebuie verificate de un jurist/contabil** înainte de lansare:

- **Termeni și condiții noi** — un „contract" între platformă (tu) și vânzători:
  comision, responsabilități, retururi, ce e interzis, cum se reziliază.
- **Statut de intermediar** — devii intermediar între vânzător și client. Asta
  aduce obligații (informarea consumatorului, politica de retur conform legii RO/UE,
  protecția datelor).
- **Fiscal** — comisionul de 10% e **venit pentru tine** → facturi + impozitare.
  Vânzătorii își gestionează propria fiscalitate (Stripe le dă rapoartele).
- **GDPR** — gestionăm date de la mai mulți vânzători; politica de confidențialitate
  trebuie actualizată.

> Recomandare: o oră cu un contabil + verificarea Termenilor de către un jurist
> înainte de a accepta primul vânzător extern. Costuri mici față de liniștea pe care o aduc.

---

## 7. Pași de implementare (partea tehnică — pentru dezvoltare)

În ordinea în care vor fi construite (după ce confirmi deciziile de la secțiunea 5):

1. **Bază de date:** tabele noi pentru *cereri de vânzător* și *conturi de
   vânzător* (cu `stripe_account_id`, status: în_așteptare / aprobat / respins),
   plus reguli de securitate (RLS).
2. **Stripe Connect:** activarea Connect în contul tău + fluxul de onboarding
   găzduit de Stripe (Account Links).
3. **Flux de cerere + aprobare:** formularul de înscriere + un **panou de
   administrare** simplu pentru tine (aprobă/respinge).
4. **Checkout pe comision:** modificăm plata existentă să folosească *destination
   charges* cu `application_fee_amount` (cei 10%) → banii se împart automat.
5. **Panou vânzător:** fiecare vânzător își vede produsele, comenzile și plățile.
6. **Termeni & legal:** actualizăm Termenii, Confidențialitatea, Retururile.

> Estimare orientativă: ~1–2 săptămâni de dezvoltare pentru un MVP solid, după
> primirea deciziilor. Stripe Connect nu are abonament lunar; se aplică doar
> comisioanele standard pe tranzacție (de confirmat tarifele curente Stripe).

---

## 8. Riscuri (ca să le știi din timp)

- **Vânzători de calitate slabă / nereali** → mitigat prin verificarea ta (Varianta A).
- **Dispute / retururi** → reguli clare în Termeni + posibilitatea de a suspenda un vânzător.
- **Obligații fiscale** → clarificate cu contabilul înainte de lansare.
- **Dependența de Stripe** → e standardul de piață, dar e bine de știut că plățile depind de el.

---

## 9. Întrebări rapide (răspunde direct aici, ca să pornim)

> Poți răspunde scurt, ex. „1: A, 2: 10% fix, 3: din vânzător, ...".

1. Nivel verificare: **A / B / C** ?
2. Comision: **10% fix** sau altceva?
3. Comisionul Stripe îl suportă: **vânzătorul / tu / clientul** ?
4. Retururile le gestionează: **vânzătorul / tu** ?
5. Program plăți: **săptămânal** sau altceva?
6. Limită produse pt. vânzători noi: **___**
7. Categorii: **cele 5 actuale** sau modificăm?
8. Ai un contabil/jurist cu care să verificăm partea legală? **Da / Nu**

---

*Acest document e o ciornă de lucru. După ce răspunzi la întrebări, îl
actualizăm și începem implementarea pas cu pas.*
