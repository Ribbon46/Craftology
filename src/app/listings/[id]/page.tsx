'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Star, Share2, ArrowLeft, MessageCircle, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { fetchListingById } from '@/lib/data/listings';
import { Listing } from '@/lib/mock';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { createConversation } from '@/actions/messages';
import { createCheckoutSession } from '@/actions/checkout';

export default function ListingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSession();
  const { setOpen } = useAuthModal();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [following, setFollowing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchListingById(params.id)
      .then((l) => { if (active) setListing(l); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  const handleMessageSeller = async () => {
    if (!listing) return;
    if (!user) { setOpen(true); return; }
    setMessaging(true);
    await createConversation(user.id, listing.seller_id, listing.id);
    setMessaging(false);
    router.push('/messages');
  };

  const handleBuy = async () => {
    if (!listing) return;
    setBuyError(null);
    setBuying(true);
    const res = await createCheckoutSession(listing.id);
    if ('url' in res && res.url) {
      window.location.href = res.url;
    } else {
      setBuyError(('error' in res && res.error) || 'Plata nu a putut fi inițiată.');
      setBuying(false);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title: listing?.title, url }); return; } catch { /* cancelled */ }
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-[60vh] font-display italic text-ink-soft">Se încarcă…</div>;
  }

  if (!listing) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] px-6 text-center">
        <h2 className="font-display text-2xl text-ink mb-2">Produsul nu a fost găsit</h2>
        <Link href="/" className="text-clay underline underline-offset-4">Înapoi la feed</Link>
      </div>
    );
  }

  const seller = listing.profiles;
  const formatPrice = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen pb-8">
      <div className="px-5 pt-4 pb-3">
        <Link href="/" className="inline-flex items-center text-sm text-ink-soft hover:text-clay transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Înapoi la feed
        </Link>
      </div>

      <div className="px-5">
        {/* Image */}
        <div className="animate-float-in">
          <div className="aspect-square w-full overflow-hidden rounded-2xl bg-cream border border-line mb-3">
            <img
              src={listing.image_urls[selectedImage] ?? listing.image_urls[0]}
              alt={listing.title}
              className="w-full h-full object-cover"
            />
          </div>
          {listing.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {listing.image_urls.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === index ? 'border-clay' : 'border-line opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Imagine ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title + price */}
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-2">
            <span className="px-3 py-1 rounded-full bg-clay-soft text-clay-deep text-[11px] font-semibold uppercase tracking-wider">
              {listing.category}
            </span>
            {seller?.rating != null && (
              <span className="flex items-center gap-1 text-gold text-sm font-medium">
                <Star className="w-4 h-4 fill-gold" />
                {seller.rating.toFixed(1)}
              </span>
            )}
          </div>
          <h1 className="font-display text-[28px] leading-tight text-ink text-balance mb-3">{listing.title}</h1>
          <div className="flex items-baseline gap-1.5">
            <span className="price text-4xl font-semibold text-clay">{formatPrice(listing.price)}</span>
            <span className="text-ink-soft text-lg">lei</span>
          </div>
        </div>

        {/* Seller */}
        <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line">
          <div className="w-11 h-11 rounded-full overflow-hidden bg-cream ring-1 ring-line grid place-items-center flex-shrink-0">
            {seller?.avatar_url ? (
              <img src={seller.avatar_url} alt={seller.username} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-lg text-ink-soft">{seller?.username?.charAt(0).toUpperCase() ?? 'V'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-ink truncate">{seller?.full_name ?? seller?.username ?? 'Vânzător'}</h3>
            <p className="text-xs text-ink-faint">Artizan Craftology</p>
          </div>
          <Button
            variant={following ? 'default' : 'outline'}
            size="sm"
            className="rounded-full text-xs flex-shrink-0"
            onClick={() => setFollowing((f) => !f)}
          >
            {following ? 'Urmărit' : 'Urmărește'}
          </Button>
        </div>

        {/* Description */}
        <div className="mt-6">
          <h3 className="font-display text-lg text-ink mb-2">Descriere</h3>
          <p className="text-[15px] text-ink-soft leading-relaxed">{listing.description}</p>
          <div className="rule-craft mt-5 mb-4" />
          <p className="text-xs text-ink-faint">
            Adăugat pe {new Date(listing.created_at).toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-7 space-y-3">
          {buyError && (
            <div className="p-3 rounded-xl bg-clay-soft text-clay-deep text-sm text-center">{buyError}</div>
          )}
          <Button className="w-full h-[52px] text-base rounded-full" onClick={handleBuy} disabled={buying}>
            <ShoppingBag className="w-5 h-5 mr-2" />
            {buying ? 'Se redirecționează…' : `Cumpără · ${formatPrice(listing.price)} lei`}
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-full" onClick={handleMessageSeller} disabled={messaging}>
            <MessageCircle className="w-4 h-4 mr-2" />
            {messaging ? 'Se deschide…' : 'Trimite mesaj'}
          </Button>
          <Button variant="ghost" className="w-full h-11 rounded-full text-ink-soft" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Partajează
          </Button>
        </div>
      </div>
    </div>
  );
}
