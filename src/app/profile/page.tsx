'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, PackageOpen } from 'lucide-react';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { avatarFor, SellerProfile, Listing } from '@/lib/mock';
import { fetchProfile, fetchSellerListings } from '@/lib/data/listings';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('listings');
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();
  const { setOpen } = useAuthModal();

  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (sessionLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([fetchProfile(user.id), fetchSellerListings(user.id)])
      .then(([p, l]) => {
        if (active) {
          setProfile(p);
          setListings(l);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, sessionLoading]);

  // Signed-out state
  if (!sessionLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <Avatar className="w-20 h-20 mb-4 ring-4 ring-cream">
          <AvatarFallback className="bg-clay-soft text-clay">?</AvatarFallback>
        </Avatar>
        <h1 className="font-display text-2xl text-ink mb-2">Profilul tău</h1>
        <p className="text-ink-soft mb-6 max-w-xs">Autentifică-te pentru a-ți vedea anunțurile, mesajele și setările.</p>
        <Button className="w-full max-w-xs rounded-full" onClick={() => setOpen(true)}>
          Autentificare
        </Button>
      </div>
    );
  }

  const displayName =
    profile?.full_name ||
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Utilizator';
  const handle = profile?.username ? `@${profile.username}` : user?.email ? `@${user.email.split('@')[0]}` : '';
  const avatarUrl =
    profile?.avatar_url || (user?.user_metadata?.avatar_url as string | undefined) || avatarFor(displayName);
  const activeCount = listings.filter((l) => l.status === 'active').length;
  const soldCount = listings.filter((l) => l.status === 'sold').length;
  const rating = profile?.rating ?? 0;

  const formatPrice = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-2xl">
      <div className="px-4 mb-5">
        <h1 className="font-display text-2xl text-ink">Profilul meu</h1>
      </div>

      {/* User card */}
      <div className="px-4 mb-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4 ring-4 ring-cream">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback className="bg-clay-soft text-clay font-display text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h2 className="font-display text-xl text-ink">{displayName}</h2>
              {handle && <p className="text-ink-soft mb-4">{handle}</p>}

              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <div className="font-display text-lg text-ink flex items-center justify-center gap-1">
                    {rating > 0 ? (
                      <>
                        <Star className="w-4 h-4 fill-gold text-gold" />
                        {rating.toFixed(1)}
                      </>
                    ) : (
                      'Nou'
                    )}
                  </div>
                  <div className="text-xs text-ink-soft">Rating</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-lg text-ink">{activeCount}</div>
                  <div className="text-xs text-ink-soft">Active</div>
                </div>
                <div className="text-center">
                  <div className="font-display text-lg text-ink">{soldCount}</div>
                  <div className="text-xs text-ink-soft">Vândute</div>
                </div>
              </div>

              <div className="flex gap-2 w-full">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => router.push('/sell')}>
                  + Vinde
                </Button>
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => router.push('/profile/settings')}>
                  Setări
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-surface">
            <TabsTrigger value="listings">Produse</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
            <TabsTrigger value="transactions">Tranzacții</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-3 pt-4">
            {loading ? (
              <p className="text-center text-ink-soft py-8">Se încarcă…</p>
            ) : listings.length === 0 ? (
              <div className="flex flex-col items-center text-center py-10">
                <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
                <p className="text-ink-soft mb-4">Nu ai niciun anunț încă.</p>
                <Button className="rounded-full" onClick={() => router.push('/sell')}>
                  Adaugă primul produs
                </Button>
              </div>
            ) : (
              <>
                {listings.map((listing) => (
                  <Card key={listing.id} className="overflow-hidden border-line">
                    <div className="flex">
                      <button
                        onClick={() => router.push(`/listings/${listing.id}`)}
                        className="w-24 h-24 flex-shrink-0 overflow-hidden bg-cream"
                      >
                        {listing.image_urls?.[0] && (
                          <img src={listing.image_urls[0]} alt={listing.title} className="w-full h-full object-cover" />
                        )}
                      </button>
                      <CardContent className="p-3 flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-ink-soft uppercase truncate">{listing.category}</span>
                          {listing.status === 'active' ? (
                            <span className="text-xs text-sage font-medium flex-shrink-0">Activ</span>
                          ) : (
                            <span className="text-xs text-ink-faint flex-shrink-0">Vândut</span>
                          )}
                        </div>
                        <h3 className="font-display text-ink line-clamp-1 mb-1">{listing.title}</h3>
                        <div className="flex items-center justify-between gap-2">
                          <span className="price font-semibold text-ink">{formatPrice(listing.price)} lei</span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs rounded-full flex-shrink-0"
                            onClick={() => router.push(`/listings/${listing.id}`)}
                          >
                            Vezi
                          </Button>
                        </div>
                      </CardContent>
                    </div>
                  </Card>
                ))}
                <div className="text-center pt-2">
                  <Button variant="outline" className="w-full rounded-full" onClick={() => router.push('/sell')}>
                    + Adaugă produs nou
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="reviews" className="pt-4">
            <div className="flex flex-col items-center text-center py-10">
              <Star className="w-10 h-10 text-ink-faint mb-3" />
              <p className="text-ink-soft">Nu ai recenzii încă.</p>
              <p className="text-xs text-ink-faint mt-1">Recenziile apar după primele vânzări.</p>
            </div>
          </TabsContent>

          <TabsContent value="transactions" className="pt-4">
            <div className="flex flex-col items-center text-center py-10">
              <PackageOpen className="w-10 h-10 text-ink-faint mb-3" />
              <p className="text-ink-soft">Nicio tranzacție încă.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
