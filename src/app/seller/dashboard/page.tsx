'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Store, CreditCard, PackageOpen, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { getMySeller, type SellerRow } from '@/actions/seller';
import { createStripeLoginLink } from '@/actions/connect';
import { fetchSellerListings } from '@/lib/data/listings';
import { SellerOrders } from '@/components/SellerOrders';
import { CloseShopButton } from '@/components/CloseShopButton';
import { Listing } from '@/lib/mock';

export default function SellerDashboardPage() {
  const { user, loading: sessionLoading } = useSession();
  const { setOpen } = useAuthModal();
  const router = useRouter();
  const [seller, setSeller] = useState<SellerRow | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!user) { setLoading(false); return; }
    Promise.all([getMySeller(), fetchSellerListings(user.id)]).then(([me, mine]) => {
      setSeller(me.seller);
      setListings(mine);
      setLoading(false);
    });
  }, [user, sessionLoading]);

  const openStripe = async () => {
    setError(null);
    setOpening(true);
    const res = await createStripeLoginLink();
    if ('url' in res && res.url) {
      window.location.href = res.url;
    } else {
      setError(('error' in res && res.error) || 'Nu am putut deschide panoul de plăți.');
      setOpening(false);
    }
  };

  if (!sessionLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h1 className="font-display text-2xl text-ink mb-2">Panoul vânzătorului</h1>
        <p className="text-ink-soft mb-6">Autentifică-te pentru a-ți vedea panoul.</p>
        <Button className="rounded-full" onClick={() => setOpen(true)}>Autentificare</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!seller || seller.status !== 'approved') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Store className="w-10 h-10 text-clay mb-3" />
        <h1 className="font-display text-2xl text-ink mb-2">Panoul vânzătorului</h1>
        <p className="text-ink-soft mb-6 max-w-xs">
          {seller ? 'Contul tău de vânzător nu este încă activ.' : 'Nu ești încă vânzător pe Craftology.'}
        </p>
        <Link href="/seller/apply"><Button className="rounded-full">Devino vânzător</Button></Link>
      </div>
    );
  }

  const active = listings.filter((l) => l.status === 'active');
  const sold = listings.filter((l) => l.status === 'sold');
  const formatPrice = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen px-4 py-6 pb-24 mx-auto w-full max-w-3xl">
      <Link href="/profile" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Store className="w-6 h-6 text-clay" />
        <h1 className="font-display text-2xl text-ink">{seller.company_name}</h1>
      </div>
      <p className="text-ink-soft mb-6">Panoul tău de vânzător</p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Stats + payouts */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <Stat label="Active" value={active.length} />
        <Stat label="Vândute" value={sold.length} />
        <div className="sm:col-span-1 col-span-2">
          {seller.stripe_onboarded ? (
            <Button variant="outline" className="w-full h-full rounded-2xl" onClick={openStripe} disabled={opening}>
              <CreditCard className="w-4 h-4 mr-2" />
              {opening ? 'Se deschide…' : 'Gestionează plățile'}
            </Button>
          ) : (
            <Link href="/seller/apply" className="block h-full">
              <Button variant="outline" className="w-full h-full rounded-2xl text-clay border-clay/30">
                <CreditCard className="w-4 h-4 mr-2" />Configurează plățile
              </Button>
            </Link>
          )}
        </div>
      </div>

      <SellerOrders />

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg text-ink">Produsele tale</h2>
        <Link href="/sell">
          <Button size="sm" className="rounded-full">
            <Plus className="w-4 h-4 mr-1" />
            Adaugă
          </Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12 text-ink-soft">
          <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
          <p>Niciun produs încă.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Card key={l.id} className="overflow-hidden border-line">
              <button onClick={() => router.push(`/listings/${l.id}`)} className="flex w-full text-left">
                <div className="relative w-20 h-20 flex-shrink-0 bg-cream">
                  {l.image_urls?.[0] && <Image src={l.image_urls[0]} alt={l.title} fill sizes="80px" className="object-cover" />}
                </div>
                <CardContent className="p-3 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-ink-soft uppercase truncate">{l.category}</span>
                    <span className={`text-xs font-medium flex-shrink-0 ${l.status === 'active' ? 'text-sage' : 'text-ink-faint'}`}>
                      {l.status === 'active' ? 'Activ' : 'Vândut'}
                    </span>
                  </div>
                  <h3 className="font-display text-ink line-clamp-1">{l.title}</h3>
                  <span className="price font-semibold text-ink">{formatPrice(l.price)} lei</span>
                </CardContent>
              </button>
            </Card>
          ))}
        </div>
      )}

      <CloseShopButton />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[3px_3px_0_0_var(--press-soft)] p-4 text-center">
      <div className="font-display text-2xl text-ink">{value}</div>
      <div className="text-xs text-ink-soft">{label}</div>
    </div>
  );
}
