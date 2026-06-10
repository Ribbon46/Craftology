'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Star, Share2, ArrowLeft, MessageCircle, ShoppingBag, Mail, Phone, Link2, BadgeCheck } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Listing } from '@/lib/mock';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { createConversation } from '@/actions/messages';
import { createCheckoutSession } from '@/actions/checkout';

// Interactive island for the listing detail page. The listing is fetched +
// rendered on the server (see page.tsx) and passed in as a prop, so the static
// content (image, title, price, description) is in the initial HTML for fast
// LCP + SEO; only the buy/message/share/gallery interactivity is client-side.
interface SellerContact {
  company_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_other: string | null;
}

export function ListingDetailClient({ listing, sellerContact }: { listing: Listing; sellerContact?: SellerContact | null }) {
  const router = useRouter();
  const { user } = useSession();
  const { setOpen } = useAuthModal();

  const [selectedImage, setSelectedImage] = useState(0);
  const [messaging, setMessaging] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);

  const handleMessageSeller = async () => {
    if (!user) { setOpen(true); return; }
    setMessaging(true);
    await createConversation(listing.id);
    setMessaging(false);
    router.push('/messages');
  };

  const handleBuy = async () => {
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
      try { await navigator.share({ title: listing.title, url }); return; } catch { /* cancelled */ }
    }
    if (navigator.clipboard) await navigator.clipboard.writeText(url);
  };

  const seller = listing.profiles;
  const formatPrice = (n: number) => new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 0 }).format(n);

  return (
    <div className="min-h-screen pb-8 mx-auto w-full max-w-5xl">
      <div className="px-5 lg:px-8 pt-4 pb-3">
        <Link href="/" className="inline-flex items-center text-sm text-ink-soft hover:text-clay transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Înapoi acasă
        </Link>
      </div>

      <div className="px-5 lg:px-8 lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
        {/* Image */}
        <div className="animate-float-in lg:sticky lg:top-28">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-cream border border-line mb-3">
            <Image
              src={listing.image_urls[selectedImage] ?? listing.image_urls[0]}
              alt={listing.title}
              fill
              priority
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          {listing.image_urls.length > 1 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {listing.image_urls.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    selectedImage === index ? 'border-clay' : 'border-line opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image src={img} alt={`Imagine ${index + 1}`} fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="mt-6 lg:mt-0">
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
          <h1 className="font-display text-[28px] lg:text-[40px] leading-tight text-ink text-balance mb-3">{listing.title}</h1>
          <div className="flex items-baseline gap-1.5">
            <span className="price text-4xl font-semibold text-clay">{formatPrice(listing.price)}</span>
            <span className="text-ink-soft text-lg">lei</span>
          </div>

          {/* Seller */}
        <div className="mt-6 flex items-center gap-3 p-4 rounded-2xl bg-surface border border-line">
          <div className="relative w-11 h-11 rounded-full overflow-hidden bg-cream ring-1 ring-line grid place-items-center flex-shrink-0">
            {seller?.avatar_url ? (
              <Image src={seller.avatar_url} alt={seller.username} fill sizes="44px" className="object-cover" />
            ) : (
              <span className="font-display text-lg text-ink-soft">{seller?.username?.charAt(0).toUpperCase() ?? 'V'}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-ink truncate">{seller?.full_name ?? seller?.username ?? 'Vânzător'}</h3>
            {sellerContact ? (
              <p className="flex items-center gap-1 text-xs text-sage">
                <BadgeCheck className="w-3.5 h-3.5" />
                Vânzător verificat
              </p>
            ) : (
              seller?.username && <p className="text-xs text-ink-faint truncate">@{seller.username}</p>
            )}
          </div>
        </div>

        {/* Direct seller contact (shown for approved sellers) */}
        {sellerContact && (sellerContact.contact_email || sellerContact.contact_phone || sellerContact.contact_other) && (
          <div className="mt-3 p-4 rounded-2xl bg-surface border border-line text-sm">
            <p className="font-medium text-ink mb-1.5">
              Contact vânzător{sellerContact.company_name ? ` · ${sellerContact.company_name}` : ''}
            </p>
            <div className="space-y-1.5 text-ink-soft">
              {sellerContact.contact_email && (
                <p className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-ink-faint flex-shrink-0" />
                  <a href={`mailto:${sellerContact.contact_email}`} className="hover:text-clay underline underline-offset-2 truncate">{sellerContact.contact_email}</a>
                </p>
              )}
              {sellerContact.contact_phone && (
                <p className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-ink-faint flex-shrink-0" />
                  <a href={`tel:${sellerContact.contact_phone}`} className="hover:text-clay underline underline-offset-2 truncate">{sellerContact.contact_phone}</a>
                </p>
              )}
              {sellerContact.contact_other && (
                <p className="flex items-center gap-2 min-w-0">
                  <Link2 className="w-4 h-4 text-ink-faint flex-shrink-0" />
                  <span className="truncate">{sellerContact.contact_other}</span>
                </p>
              )}
            </div>
          </div>
        )}

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
    </div>
  );
}
