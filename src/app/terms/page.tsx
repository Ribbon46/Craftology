import Link from 'next/link';
import { ArrowLeft, TriangleAlert } from 'lucide-react';
import { COMPANY } from '@/config/app';

export const metadata = { title: 'Termeni și Condiții · Craftology' };

export default function TermsPage() {
  return (
    <div className="min-h-screen px-5 py-6 pb-24 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-clay mb-5 text-sm">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi
      </Link>
      <h1 className="font-display text-3xl text-ink mb-1">Termeni și Condiții</h1>
      <p className="text-xs text-ink-faint mb-6">Ultima actualizare: {COMPANY.legalUpdated}</p>

      <div className="space-y-5 text-sm text-ink-soft leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-1">
        <p>
          Acești Termeni reglementează utilizarea platformei <strong>Craftology</strong> („Platforma”),
          operată de <strong>{COMPANY.legalName}</strong>, cu sediul în {COMPANY.address}, CUI {COMPANY.cui},
          înregistrată la Registrul Comerțului sub nr. {COMPANY.regCom} („Operatorul”, „noi”). Prin crearea unui cont sau
          utilizarea Platformei, ești de acord cu acești Termeni.
        </p>

        <h2>1. Ce este Craftology</h2>
        <p>
          Craftology este un <strong>marketplace curat de produse handmade românești</strong> (bijuterii,
          haine, lumânări, accesorii, produse de îngrijire). Spre deosebire de platformele deschise,
          Craftology listează <strong>doar vânzători verificați și aprobați</strong> de Operator. Operatorul
          acționează ca <strong>intermediar</strong> între cumpărători și vânzători verificați, iar pentru
          produsele proprii Deco Kubik acționează ca vânzător direct.
        </p>

        <h2>2. Definiții</h2>
        <p>
          <strong>Vânzător verificat</strong> – persoană fizică autorizată sau juridică aprobată de Operator
          pentru a lista produse handmade. <strong>Cumpărător</strong> – utilizator care achiziționează produse.
          <strong> Anunț</strong> – o listare de produs. <strong>Comision</strong> – procentul reținut de Platformă
          din valoarea unei vânzări.
        </p>

        <h2>3. Conturi și verificarea vânzătorilor</h2>
        <p>
          Pentru a cumpăra ai nevoie de un cont (email + parolă). Pentru a <strong>vinde</strong>, trebuie să
          depui o cerere și să fii <strong>verificat și aprobat</strong> de Operator. Verificarea poate include:
          confirmarea identității, dovada caracterului handmade al produselor, statutul fiscal (PFA/SRL),
          și verificarea de identitate (KYC) prin furnizorul de plăți. Operatorul își rezervă dreptul de a
          aproba, respinge sau revoca statutul de vânzător, la discreția sa, pentru a menține calitatea Platformei.
          Ești responsabil pentru confidențialitatea datelor contului tău.
        </p>

        <h2>4. Listarea produselor</h2>
        <p>
          Vânzătorii verificați garantează că produsele sunt <strong>handmade, autentice, legale</strong> și
          descrise corect (materiale, dimensiuni, preț în RON, fotografii reale). Sunt interzise produsele
          contrafăcute, ilegale, periculoase sau care încalcă drepturi ale terților. Operatorul poate elimina
          orice anunț neconform.
        </p>

        <h2>5. Plăți, prețuri și comision</h2>
        <p>
          Plățile sunt procesate securizat prin <strong>Stripe</strong>. Prețurile sunt afișate în RON și includ
          TVA acolo unde este aplicabil. Pentru vânzările vânzătorilor verificați, Platforma reține un
          <strong> comision de 15%</strong> din valoarea tranzacției, iar restul este transferat vânzătorului
          (mai puțin comisioanele procesatorului de plăți). Vânzătorii sunt responsabili pentru obligațiile lor
          fiscale (facturare, TVA, impozite).
        </p>

        <h2>6. Livrare</h2>
        <p>
          Livrarea se realizează între vânzător și cumpărător. Termenii de livrare, costurile și metodele sunt
          stabiliți de vânzător și comunicați înainte de finalizarea comenzii.
        </p>

        <h2>7. Dreptul de retragere și retururi</h2>
        <p>
          Cumpărătorii consumatori beneficiază de dreptul legal de retragere în 14 zile, cu excepțiile prevăzute
          de lege (ex. produse personalizate / realizate la comandă). Vezi{' '}
          <Link href="/returns" className="text-clay underline underline-offset-2">Politica de Retur</Link>.
        </p>

        <h2>8. Proprietate intelectuală</h2>
        <p>
          Conținutul Platformei (design, mărci, cod) aparține Operatorului. Vânzătorii păstrează drepturile
          asupra fotografiilor și descrierilor proprii, dar acordă Operatorului o licență de afișare pe Platformă.
        </p>

        <h2>9. Limitarea răspunderii</h2>
        <p>
          Pentru produsele vânzătorilor terți, Operatorul acționează ca intermediar și nu este parte la contractul
          de vânzare; răspunderea pentru produs revine vânzătorului. Platforma este oferită „ca atare”, fără
          garanții privind disponibilitatea neîntreruptă.
        </p>

        <h2>10. Date cu caracter personal</h2>
        <p>
          Prelucrăm datele conform{' '}
          <Link href="/privacy" className="text-clay underline underline-offset-2">Politicii de Confidențialitate</Link>.
        </p>

        <h2>11. Soluționarea litigiilor</h2>
        <p>
          Reclamațiile pot fi adresate la {COMPANY.email}. Consumatorii se pot adresa ANPC (anpc.ro) și platformei
          europene SOL (ec.europa.eu/consumers/odr). Acești Termeni sunt guvernați de legea română; litigiile
          se soluționează de instanțele competente din România.
        </p>

        <h2>12. Modificări</h2>
        <p>Putem actualiza acești Termeni; versiunea curentă este publicată pe această pagină.</p>

        <p className="flex items-start gap-1.5 text-xs text-ink-faint pt-6 border-t border-line mt-6">
          <TriangleAlert className="w-3.5 h-3.5 text-clay flex-shrink-0 mt-px" />
          <span>
            Acest document este în curs de revizuire juridică (drept comercial / protecția consumatorului /
            GDPR în România) înainte de lansarea publică.
          </span>
        </p>
      </div>
    </div>
  );
}
