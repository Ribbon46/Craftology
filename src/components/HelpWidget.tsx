'use client';

import { useEffect, useState } from 'react';
import { HelpCircle, X, MessageCircle, Mail } from 'lucide-react';
import { COMPANY } from '@/config/app';

// Floating "Ajutor" widget: a scripted quick-helper (the "robotel") answering
// the most common questions instantly, plus direct WhatsApp/email lines to the
// admin. No external chat service, no cost, works offline-ish.
// WhatsApp number = the shop phone from the lawyer's Terms (0732 781 226).
const WHATSAPP = '40732781226';

const FAQ: Array<{ q: string; a: string }> = [
  {
    q: 'Cum cumpăr un produs?',
    a: 'Deschide produsul care îți place și apasă „Cumpără". Plătești în siguranță cu cardul (prin Stripe), iar adresa de livrare o completezi chiar la plată. Nu ai nevoie de cont ca să cumperi.',
  },
  {
    q: 'Cum returnez un produs sau renunț la comandă?',
    a: 'Ai dreptul legal de retragere în 14 zile de la primire. Din contul tău: Profil → Tranzacții → „Retur / Renunțare la achiziție". Dacă ai cumpărat fără cont, folosește butonul de pe pagina de confirmare a comenzii sau scrie-ne pe email. Banii revin în 5–10 zile lucrătoare.',
  },
  {
    q: 'Cum devin vânzător?',
    a: 'Creează-ți un cont, apoi din Profil deschide „Devino vânzător". Completezi datele firmei (SRL/PFA + CUI), noi verificăm și aprobăm cererea, apoi configurezi plățile prin Stripe și poți publica produse.',
  },
  {
    q: 'Nu îmi ajunge emailul de confirmare',
    a: 'Verifică folderul Spam (sau Promotions în Gmail). Dacă tot nu apare în câteva minute, scrie-ne pe WhatsApp sau email și te ajutăm imediat.',
  },
  {
    q: 'Cum contactez un vânzător?',
    a: 'Prin mesageria aplicației: apasă „Trimite mesaj" pe pagina produsului (îți faci un cont gratuit în câteva secunde). Dacă ai o întrebare înainte de a-ți face cont, scrie-ne nouă pe WhatsApp sau email — butoanele de mai jos — și te ajutăm noi.',
  },
];

export function HelpWidget() {
  const [open, setOpen] = useState(false);
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Hold back while the cookie-consent banner occupies the same bottom zone
  // (it renders above us in z-order and would cover the button on phones).
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const check = () => {
      try {
        setReady(!!localStorage.getItem('craftzaar-cookie-consent'));
      } catch {
        setReady(true);
      }
    };
    check();
    window.addEventListener('cz-consent-set', check);
    return () => window.removeEventListener('cz-consent-set', check);
  }, []);

  if (!ready) return null;

  return (
    <>
      {/* Floating button — above the mobile bottom nav, corner on desktop */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Închide ajutorul' : 'Deschide ajutorul'}
        className="fixed right-4 bottom-24 lg:bottom-6 z-[55] inline-flex items-center gap-1.5 rounded-full bg-ink text-paper pl-3 pr-4 py-2.5 text-sm font-medium border-[1.5px] border-edge shadow-[3px_3px_0_0_var(--press)] hover:-translate-y-px transition-transform"
      >
        {open ? <X className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
        Ajutor
      </button>

      {open && (
        <div className="fixed right-4 bottom-36 lg:bottom-[4.5rem] z-[55] w-[calc(100vw-2rem)] max-w-sm rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[5px_5px_0_0_var(--press-soft)] overflow-hidden">
          <div className="bg-clay-soft/50 border-b border-line px-4 py-3">
            <p className="font-display text-lg text-ink leading-tight">Ai nevoie de ajutor?</p>
            <p className="text-xs text-ink-soft">Răspunsuri rapide sau contact direct.</p>
          </div>

          <div className="max-h-[45vh] overflow-y-auto px-2 py-2">
            {FAQ.map((f, i) => (
              <div key={i} className="rounded-xl">
                <button
                  type="button"
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  className="w-full text-left px-2.5 py-2.5 text-sm font-medium text-ink hover:text-clay transition-colors flex items-start gap-2"
                >
                  <span className="text-clay shrink-0">{openIdx === i ? '−' : '+'}</span>
                  {f.q}
                </button>
                {openIdx === i && (
                  <p className="px-2.5 pb-3 pl-7 text-sm text-ink-soft leading-relaxed">{f.a}</p>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-line p-3 flex gap-2">
            <a
              href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Bună! Am o întrebare despre Craft'zaar.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25D366] text-white px-3 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
            <a
              href={`mailto:${COMPANY.email}`}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border-[1.5px] border-line-strong text-ink px-3 py-2.5 text-sm font-medium hover:border-clay/45 hover:text-clay transition-colors"
            >
              <Mail className="w-4 h-4" /> Email
            </a>
          </div>
        </div>
      )}
    </>
  );
}
