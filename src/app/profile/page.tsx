'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { avatarFor } from '@/lib/mock';

const MOCK_LISTINGS = [
  {
    id: '1',
    title: 'Colier Mărgele Colorate - Handmade',
    price: 85,
    category: 'Bijuterii',
    image_url: 'https://placehold.co/600x600/e2e8f0/475569?text=Colier+margele',
    status: 'active',
  },
  {
    id: '2',
    title: 'Pantofi Piele Artizanal - Românești',
    price: 250,
    category: 'Haine',
    image_url: 'https://placehold.co/600x600/e2e8f0/475569?text=Pantofi+piele',
    status: 'sold',
  },
];

const MOCK_REVIEWS = [
  { id: '1', reviewer: 'Andrei Popescu', rating: 5, date: '15 Mai 2026', comment: 'Produs excelent, calitate foarte bună! Recomand cu încredere.' },
  { id: '2', reviewer: 'Maria Ionescu', rating: 4, date: '10 Mai 2026', comment: 'Frumos, dar livrarea a fost puțin întârziată.' },
];

const MOCK_TRANSACTIONS = [
  { id: '1', buyer: 'Andrei Popescu', amount: 85, date: '15 Mai 2026', status: 'Completat', item: 'Colier Mărgele Colorate' },
  { id: '2', buyer: 'Maria Ionescu', amount: 250, date: '10 Mai 2026', status: 'Completat', item: 'Pantofi Piele Artizanal' },
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('listings');
  const router = useRouter();
  const { user } = useSession();
  const { setOpen } = useAuthModal();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split('@')[0] ||
    'Vânzător premium';
  const displayHandle = user?.email ? `@${user.email.split('@')[0]}` : '@vanzator_premium';
  const avatarUrl = (user?.user_metadata?.avatar_url as string | undefined) || avatarFor(displayName);

  return (
    <div className="min-h-screen pb-20 pt-4">
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold text-ink">Profilul meu</h1>
      </div>

      {/* User Card */}
      <div className="px-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col items-center">
              <Avatar className="w-24 h-24 mb-4 ring-4 ring-cream">
                <AvatarImage src={avatarUrl} alt={displayName} />
                <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-ink">{displayName}</h2>
              <p className="text-ink-soft mb-3">{displayHandle}</p>

              <div className="flex items-center space-x-4 mb-6">
                <div className="text-center">
                  <div className="text-lg font-bold text-ink">4.9</div>
                  <div className="text-xs text-ink-soft">Rating</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-ink">128</div>
                  <div className="text-xs text-ink-soft">Vânzări</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-ink">98%</div>
                  <div className="text-xs text-ink-soft">Acceptare</div>
                </div>
              </div>

              {user ? (
                <div className="flex space-x-2 w-full">
                  <Button variant="outline" className="flex-1 h-10" onClick={() => router.push('/profile/settings')}>
                    Editează profil
                  </Button>
                  <Button variant="outline" className="flex-1 h-10" onClick={() => router.push('/profile/settings')}>
                    Setări
                  </Button>
                </div>
              ) : (
                <Button className="w-full h-10" onClick={() => setOpen(true)}>
                  Autentificare
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: '8', label: 'Active' },
            { value: '15', label: 'Vândute' },
            { value: '2.5k', label: 'Vizualizări' },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-ink">{stat.value}</div>
                  <div className="text-xs text-ink-soft">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 bg-surface">
            <TabsTrigger value="listings">Produse</TabsTrigger>
            <TabsTrigger value="reviews">Recenzii</TabsTrigger>
            <TabsTrigger value="transactions">Tranzacții</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-4 pt-4">
            {MOCK_LISTINGS.map((listing) => (
              <Card key={listing.id} className="overflow-hidden border-line">
                <div className="flex">
                  <button
                    onClick={() => router.push(`/listings/${listing.id}`)}
                    className="w-24 h-24 flex-shrink-0 overflow-hidden"
                  >
                    <img src={listing.image_url} alt={listing.title} className="w-full h-full object-cover" />
                  </button>
                  <CardContent className="p-3 flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <span className="text-xs font-medium text-ink-soft uppercase">{listing.category}</span>
                      {listing.status === 'active' ? (
                        <span className="text-xs text-green-600 font-medium">Activ</span>
                      ) : (
                        <span className="text-xs text-ink-soft">Vândut</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-ink mb-1">{listing.title}</h3>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink">{listing.price} lei</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => router.push(`/listings/${listing.id}`)}
                      >
                        Vezi
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            ))}

            <div className="text-center py-6">
              <Button variant="outline" className="w-full" onClick={() => router.push('/sell')}>
                + Adaugă produs nou
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4 pt-4">
            {MOCK_REVIEWS.map((review) => (
              <Card key={review.id} className="border-line">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-ink">{review.reviewer}</h4>
                    <span className="text-xs text-ink-soft">{review.date}</span>
                  </div>
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'text-gold fill-gold' : 'text-line-strong'}`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-ink-soft">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4 pt-4">
            {MOCK_TRANSACTIONS.map((transaction) => (
              <Card key={transaction.id} className="border-line">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-ink">{transaction.item}</div>
                      <div className="text-sm text-ink-soft">Cumpărător: {transaction.buyer}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-ink">{transaction.amount} lei</div>
                      <div className="text-xs text-green-600">{transaction.status}</div>
                    </div>
                  </div>
                  <div className="text-xs text-ink-faint">{transaction.date}</div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
