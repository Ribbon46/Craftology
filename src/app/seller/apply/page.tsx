'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Store, Clock, CheckCircle2, XCircle, CreditCard } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuthModal } from '@/lib/auth-modal';
import { getMySeller, applyAsSeller, resendSellerApplication, type SellerRow } from '@/actions/seller';
import { createSellerOnboardingLink, syncSellerStripeStatus } from '@/actions/connect';

export default function SellerApplyPage() {
  const { setOpen } = useAuthModal();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [seller, setSeller] = useState<SellerRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const refresh = () =>
    getMySeller().then((r) => {
      setAuthed(r.authed);
      setSeller(r.seller);
      setLoading(false);
    });

  useEffect(() => {
    const fromStripe =
      typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('stripe') === 'return';
    (async () => {
      if (fromStripe) {
        try {
          await syncSellerStripeStatus();
        } catch {
          /* ignore */
        }
      }
      await refresh();
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await applyAsSeller(new FormData(e.currentTarget));
    setSaving(false);
    if ('error' in res && res.error) {
      setError(res.error);
      return;
    }
    setDone(true);
    refresh();
  };

  const handleOnboard = async () => {
    setError(null);
    setOnboarding(true);
    const res = await createSellerOnboardingLink();
    if ('url' in res && res.url) {
      window.location.href = res.url;
    } else {
      setError(('error' in res && res.error) || 'Nu am putut deschide configurarea plăților.');
      setOnboarding(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-24 mx-auto w-full max-w-2xl">
      <Link href="/profile" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Store className="w-6 h-6 text-clay" />
        <h1 className="font-display text-2xl text-ink">Devino vânzător</h1>
      </div>
      <p className="text-ink-soft mb-6">Vinde-ți produsele handmade pe Craft&apos;zaar, alături de creatori verificați.</p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !authed ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-ink-soft mb-4">Autentifică-te pentru a trimite o cerere de vânzător.</p>
            <Button className="rounded-full" onClick={() => setOpen(true)}>Autentificare</Button>
          </CardContent>
        </Card>
      ) : seller || done ? (
        <StatusCard seller={seller ?? ({ status: 'pending', stripe_onboarded: false } as SellerRow)} onboarding={onboarding} onOnboard={handleOnboard} />
      ) : (
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-xl bg-cream border border-line p-3 text-sm text-ink-soft">
                Pentru a putea emite facturi, vânzătorii trebuie să fie <strong className="text-ink">persoană juridică</strong> (firmă, PFA sau II).
              </div>

              <Field label="Denumire firmă *" name="company_name" placeholder="ex: Atelier Handmade SRL" required />
              <Field label="CUI (cod fiscal) *" name="cui" placeholder="ex: RO12345678" required />

              <div className="space-y-2">
                <p className="text-sm font-medium text-ink">Date de contact (afișate cumpărătorilor) *</p>
                <Field name="contact_email" type="email" placeholder="Email de contact" />
                <Field name="contact_phone" placeholder="Telefon de contact" />
                <Field name="contact_other" placeholder="Website / rețele sociale (opțional)" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-ink" htmlFor="workshop_description">Despre atelierul tău</label>
                <Textarea id="workshop_description" name="workshop_description" rows={4} placeholder="Descrie ce produse faci, materialele, povestea atelierului…" className="resize-none" />
              </div>

              <label className="flex items-start gap-3 text-sm text-ink-soft">
                <input type="checkbox" name="accept_terms" className="mt-1 w-4 h-4 accent-clay" />
                <span>
                  Accept{' '}
                  <Link href="/terms" target="_blank" className="text-ink underline underline-offset-2 hover:text-clay">Termenii și Condițiile</Link>,{' '}
                  <Link href="/seller-agreement" target="_blank" className="text-ink underline underline-offset-2 hover:text-clay">Acordul Vânzătorului</Link>{' '}
                  și{' '}
                  <Link href="/privacy" target="_blank" className="text-ink underline underline-offset-2 hover:text-clay">Politica de confidențialitate</Link>.
                </span>
              </label>

              <Button type="submit" className="w-full rounded-full" disabled={saving}>
                {saving ? 'Se trimite…' : 'Trimite cererea'}
              </Button>
              <p className="text-xs text-ink-faint text-center">
                Cererea e verificată manual. După aprobare, vei configura plățile prin Stripe.
              </p>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Field({ label, name, ...rest }: { label?: string; name: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium text-ink" htmlFor={name}>{label}</label>}
      <Input id={name} name={name} {...rest} />
    </div>
  );
}

function StatusCard({ seller, onboarding, onOnboard }: { seller: SellerRow; onboarding: boolean; onOnboard: () => void }) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendErr, setResendErr] = useState<string | null>(null);

  const resend = async () => {
    setResending(true);
    setResendErr(null);
    const r = await resendSellerApplication();
    setResending(false);
    if ('error' in r) setResendErr(r.error);
    else setResent(true);
  };

  const map = {
    pending: { icon: Clock, color: 'text-gold', title: 'Cererea ta este în verificare', body: 'Îți mulțumim! Verificăm cererea și revenim cât de curând.' },
    approved: { icon: CheckCircle2, color: 'text-sage', title: 'Ești vânzător aprobat', body: 'Felicitări! Mai e un singur pas: configurează plățile prin Stripe ca să poți încasa bani.' },
    rejected: { icon: XCircle, color: 'text-clay-deep', title: 'Cererea a fost respinsă', body: seller.rejection_reason || 'Din păcate, cererea nu a fost aprobată momentan.' },
    suspended: { icon: XCircle, color: 'text-clay-deep', title: 'Cont de vânzător suspendat', body: 'Contul tău de vânzător este suspendat. Contactează-ne pentru detalii.' },
  } as const;
  const s = map[seller.status] ?? map.pending;
  const Icon = s.icon;

  return (
    <Card>
      <CardContent className="p-6 text-center">
        <Icon className={`w-12 h-12 mx-auto mb-3 ${s.color}`} />
        <h2 className="font-display text-xl text-ink mb-2">{s.title}</h2>
        <p className="text-ink-soft mb-4 max-w-sm mx-auto">{s.body}</p>

        {seller.status === 'pending' && (
          <div className="space-y-2">
            {resent ? (
              <p className="inline-flex items-center gap-1.5 text-sage text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Cererea a fost retrimisă
              </p>
            ) : (
              <Button variant="outline" className="rounded-full" onClick={resend} disabled={resending}>
                {resending ? 'Se retrimite…' : 'Retrimite cererea'}
              </Button>
            )}
            {resendErr && <p className="text-xs text-destructive">{resendErr}</p>}
          </div>
        )}

        {seller.status === 'approved' && (
          seller.stripe_onboarded ? (
            <div className="space-y-3">
              <p className="inline-flex items-center gap-1.5 text-sage text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" /> Plăți configurate
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/seller/dashboard"><Button variant="outline" className="rounded-full">Panoul vânzătorului</Button></Link>
                <Link href="/sell"><Button className="rounded-full">Adaugă un produs</Button></Link>
              </div>
            </div>
          ) : (
            <Button className="rounded-full" onClick={onOnboard} disabled={onboarding}>
              <CreditCard className="w-4 h-4 mr-2" />
              {onboarding ? 'Se deschide…' : 'Configurează plățile (Stripe)'}
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
