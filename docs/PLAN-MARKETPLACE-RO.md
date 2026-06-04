# Plan CONFIRMAT: Marketplace cu Vânzători Verificați — Deco Kubik (Faza 2)

> **Pentru:** Deco Kubik (proprietar) · **Actualizat:** 4 iunie 2026
> **Scop:** transformăm aplicația dintr-un magazin cu un singur vânzător într-un
> **marketplace** unde mai mulți creatori *verificați* își vând produsele handmade,
> iar tu reții un **comision de 15%** din fiecare vânzare.

## ✅ Decizii confirmate

| # | Întrebare | Decizie |
|---|-----------|---------|
| 1 | Nivel de verificare | **Varianta A** — tu aprobi manual + Stripe verifică identitatea |
| 2 | Comision | **15% fix**, la toate categoriile |
| 3 | Cine suportă comisionul Stripe (~1,5%) | **Vânzătorul** (tu primești 15% „curat") |
| 4 | Cine gestionează retururile/reclamațiile | **Vânzătorul** (tu mediezi doar la nevoie) |
| 5 | Program de plată către vânzători | **Săptămânal** (programul standard Stripe) |
| 6 | Limită pentru vânzători noi | **Max. 20 de produse** până la prima vânzare |
| 7 | Categorii | **Cele 5 actuale** (Bijuterii, Haine, Lumânări, Accesorii, Frumusețe) |
| 8 | Verificare legală | **Da** — ai contabil/jurist (verificăm Termenii cu el înainte de lansare) |

### Cerințe obligatorii suplimentare (cerute de tine)

- 🧾 **Vânzătorul trebuie să fie persoană juridică** (firmă / PFA / II) ca să poată
  emite factură — **obligatoriu**. Cerem datele firmei (denumire + CUI) la înscriere.
- 📜 **Vânzătorul trebuie să accepte** Termenii & Condițiile + Politica de
  confidențialitate — **obligatoriu** (bifă explicită, salvată cu dată).
- 📞 **Contul vânzătorului include date de contact directe** (telefon / email /
  rețele) afișate cumpărătorului, pentru contact direct vânzător ↔ cumpărător.

---

## 1. Pe scurt (ce se schimbă)

| | Acum (Faza 1) | După (Faza 2) |
|---|---|---|
| Cine vinde | Doar Deco Kubik | Mai mulți vânzători verificați (persoane juridice) |
| Unde merg banii | În contul tău Stripe | **Direct** în contul fiecărui vânzător |
| Ce primești tu | 100% (e magazinul tău) | **Comision 15%** din fiecare vânzare, automat |
| Verificare vânzători | — | Tu aprobi + Stripe verifică identitatea |
| Plăți / facturi | Tu | Stripe plătește vânzătorii; tu facturezi doar comisionul de 15% |

Pe scurt: **tu devii „gazda" pieței**, nu mai ții tu banii altora. Stripe se ocupă
de plăți, de verificarea de identitate și de virarea banilor către vânzători. Tu
păstrezi automat 15% din fiecare comandă.

---

## 2. Cum devine cineva vânzător (verificarea — Varianta A)

Pașii prin care trece un creator nou:

1. **Cerere** — completează un formular în aplicație: datele atelierului, **datele
   firmei (denumire + CUI)**, **date de contact** pentru cumpărători, poze/link-uri
   cu produsele. Bifează **obligatoriu** acceptul Termenilor + Confidențialității.
2. **Verificare** — tu (sau o persoană desemnată) te uiți peste cerere.
3. **Aprobare / respingere** — dintr-un panou simplu de administrare.
4. **Onboarding Stripe** — vânzătorul aprobat e trimis la un formular **găzduit de
   Stripe** (cont de **business**) unde își pune IBAN-ul + datele firmei. Stripe
   verifică automat (KYC). Tu **nu** vezi și nu stochezi aceste date sensibile.
5. **Gata** — abia după ce Stripe confirmă, vânzătorul poate publica produse
   (max. 20 la început) și poate încasa bani.

---

## 3. Comisionul (15%)

La fiecare vânzare, banii se împart **automat** de către Stripe:

| Preț produs | Primește vânzătorul (85%) | Primești tu (15%) |
|---|---|---|
| 50 lei | 42,50 lei | 7,50 lei |
| 120 lei | 102 lei | 18 lei |
| 250 lei | 212,50 lei | 37,50 lei |

> Comisionul Stripe (~1,5% + o taxă mică pe tranzacție) se **scade din partea
> vânzătorului**, conform deciziei — așa tu primești cei 15% „curați". Tehnic:
> contul vânzătorului e „comerciantul" care suportă taxa Stripe, iar platforma ta
> ia 15% ca `application fee` peste.

---

## 4. Cum primesc banii vânzătorii (Stripe Connect)

Folosim **Stripe Connect (conturi Express, tip business)** — standardul pentru
marketplace-uri:

- Fiecare vânzător are **propriul cont Stripe**, conectat la platforma ta.
- La o comandă, clientul plătește o singură dată; Stripe **virează automat** 85%
  către vânzător și 15% către tine.
- Stripe **plătește vânzătorii** către IBAN-ul lor **săptămânal** și se ocupă de
  verificarea de identitate (KYC) și de raportările lor.
- **Tu nu atingi niciodată banii altora** — ceea ce te scutește de multe obligații
  legale și fiscale (banii lor nu trec prin contul tău).

---

## 5. ⚖️ Aspecte legale (de verificat cu juristul/contabilul tău)

Ai confirmat că ai un contabil/jurist — perfect; verificăm cu el înainte de a
accepta primul vânzător extern. Punctele de pregătit:

- **Termeni & Condiții (contract platformă–vânzător):** comision 15%, vânzătorul e
  persoană juridică, vânzătorul răspunde de produs + retururi, acceptul obligatoriu,
  cum se reziliază.
- **Statut de intermediar** — devii intermediar între vânzător și client (obligații
  de informare a consumatorului, politica de retur conform legii RO/UE, GDPR).
- **Fiscal** — comisionul de 15% e **venit pentru tine** → emiți factură pentru el.
  Vânzătorii (persoane juridice) emit factură către clienți și își gestionează
  propria fiscalitate (Stripe le dă rapoartele).
- **GDPR** — gestionăm date de la mai mulți vânzători (inclusiv datele de contact
  afișate) → actualizăm politica de confidențialitate.

---

## 6. Pași de implementare (partea tehnică)

În ordinea în care le construim:

1. **Bază de date + securitate:** tabele pentru *cereri de vânzător* și *conturi de
   vânzător* (status: în_așteptare / aprobat / respins / suspendat, `stripe_account_id`,
   date firmă + CUI, date de contact, acceptul Termenilor cu dată), reguli RLS.
2. **Înscriere vânzător:** formularul cu datele firmei + contact + bifa obligatorie
   de accept Termeni/Confidențialitate.
3. **Panou de administrare (pentru tine):** listă cereri + aprobă/respinge/suspendă.
4. **Stripe Connect:** activarea Connect în contul tău + onboarding găzduit (business).
5. **Checkout pe comision:** plata folosește *destination charges* cu
   `application_fee_amount` = **15%**, vânzătorul ca „comerciant" (suportă taxa Stripe).
6. **Limită produse** (max. 20 pentru vânzători noi) + **datele de contact** afișate
   pe pagina produsului/vânzătorului.
7. **Panou vânzător:** produsele, comenzile și plățile lui.
8. **Termeni & legal:** actualizăm Termenii, Confidențialitatea, Retururile (15%,
   persoană juridică, responsabilitatea vânzătorului) — apoi verificare cu juristul.

> **Estimare:** ~1–2 săptămâni pentru un MVP solid. Stripe Connect nu are abonament
> lunar; se aplică doar comisioanele standard pe tranzacție.
>
> **Ce e nevoie din partea ta pentru a porni live:** (a) activarea **Stripe Connect**
> în contul Stripe (un singur buton în dashboard), (b) datele firmei tale (CUI) pentru
> Termeni + factura de comision, (c) verificarea Termenilor cu juristul.

---

## 7. Riscuri (ca să le știi din timp)

- **Vânzători de calitate slabă / nereali** → mitigat prin aprobarea ta (Varianta A)
  + cerința de persoană juridică.
- **Dispute / retururi** → reguli clare în Termeni + posibilitatea de a suspenda un vânzător.
- **Obligații fiscale** → clarificate cu contabilul înainte de lansare.
- **Dependența de Stripe** → e standardul de piață, dar plățile depind de el.

---

*Deciziile sunt confirmate. Începem implementarea pas cu pas, în ordinea de mai sus.*
