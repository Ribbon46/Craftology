import Link from 'next/link';
import { ArrowLeft, TriangleAlert } from 'lucide-react';

export const metadata = { title: 'Politica de Confidențialitate · Craftology' };

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-5 py-6 pb-24 max-w-2xl mx-auto">
      <Link href="/" className="inline-flex items-center text-ink-soft hover:text-clay mb-5 text-sm">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi
      </Link>
      <h1 className="font-display text-3xl text-ink mb-1">Politica de Confidențialitate</h1>
      <p className="text-xs text-ink-faint mb-6">Conformă cu GDPR (Regulamentul UE 2016/679). Ultima actualizare: [DATĂ]</p>

      <div className="space-y-5 text-sm text-ink-soft leading-relaxed [&_h2]:font-display [&_h2]:text-lg [&_h2]:text-ink [&_h2]:mt-6 [&_h2]:mb-1">
        <h2>1. Operatorul de date</h2>
        <p>
          <strong>Deco Kubik SRL</strong>, [ADRESĂ], CUI [CUI]. Pentru orice solicitare privind datele tale:
          <strong> [EMAIL]</strong>.
        </p>

        <h2>2. Ce date colectăm</h2>
        <p>
          <strong>Cont:</strong> adresă de email, parolă (criptată), nume. <strong>Profil:</strong> nume afișat,
          fotografie, evaluări. <strong>Anunțuri și mesaje:</strong> conținutul produselor și al conversațiilor.
          <strong> Plăți:</strong> procesate de Stripe — nu stocăm datele cardului tău. <strong>Tehnice:</strong>{' '}
          cookie-uri strict necesare pentru autentificare.
        </p>

        <h2>3. Scopuri și temei legal</h2>
        <p>
          Furnizarea serviciului și executarea contractului (art. 6(1)(b) GDPR): cont, anunțuri, comenzi, mesaje.
          Procesarea plăților și prevenirea fraudei (interes legitim / obligație legală). Comunicări legate de cont.
          Respectarea obligațiilor legale (fiscale, contabile).
        </p>

        <h2>4. Persoane împuternicite (procesatori)</h2>
        <p>
          Folosim furnizori care prelucrează date în numele nostru: <strong>Supabase</strong> (bază de date și
          autentificare), <strong>Vercel</strong> (găzduire), <strong>Stripe</strong> (plăți). Aceștia pot prelucra
          date în afara României/UE, cu garanții adecvate (clauze contractuale standard).
        </p>

        <h2>5. Cât timp păstrăm datele</h2>
        <p>
          Datele de cont — pe durata existenței contului. Datele de tranzacție — conform termenelor legale
          (contabile/fiscale, de regulă până la 10 ani). Poți cere ștergerea contului oricând.
        </p>

        <h2>6. Drepturile tale</h2>
        <p>
          Ai dreptul de acces, rectificare, ștergere („dreptul de a fi uitat”), restricționare, portabilitate și
          opoziție, precum și dreptul de a-ți retrage consimțământul. Le poți exercita scriind la [EMAIL]. Ai
          dreptul de a depune o plângere la <strong>ANSPDCP</strong> (Autoritatea Națională de Supraveghere a
          Prelucrării Datelor cu Caracter Personal, dataprotection.ro).
        </p>

        <h2>7. Cookie-uri</h2>
        <p>
          Folosim doar cookie-uri strict necesare (sesiunea de autentificare). Nu folosim cookie-uri de publicitate.
        </p>

        <h2>8. Securitate</h2>
        <p>
          Aplicăm măsuri tehnice rezonabile (criptare în tranzit, acces restricționat la baza de date prin
          Row Level Security). Niciun sistem nu este 100% sigur, dar ne angajăm să protejăm datele tale.
        </p>

        <p className="flex items-start gap-1.5 text-xs text-ink-faint pt-6 border-t border-line mt-6">
          <TriangleAlert className="w-3.5 h-3.5 text-clay flex-shrink-0 mt-px" />
          <span>
            Document-șablon. Completează câmpurile [ ] și obține revizuirea unui avocat / specialist GDPR înainte
            de lansare. Vezi și{' '}
            <Link href="/terms" className="text-clay underline underline-offset-2">Termenii și Condițiile</Link>.
          </span>
        </p>
      </div>
    </div>
  );
}
