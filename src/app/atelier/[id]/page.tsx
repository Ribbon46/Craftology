import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowLeft, BadgeCheck, Mail, Phone, Globe, CalendarDays } from 'lucide-react';
import { ListingCard } from '@/components/ListingCard';
import { fetchSellerPublicById, fetchSellerListingsServer } from '@/lib/data/listings.server';
import { avatarFor } from '@/lib/mock';

// The artisan's public page. Reached from the seller name under a product
// title (owner request), so it has to answer "who made this?" — brand, their
// own description of the workshop, contact, and everything else they sell.
export const revalidate = 300;

async function loadAtelier(id: string) {
  const [seller, listings] = await Promise.all([
    fetchSellerPublicById(id),
    fetchSellerListingsServer(id),
  ]);
  // Fall back to the profile carried on their listings when the seller row
  // isn't public (platform-owned catalogue has no `sellers` application).
  const profile = listings[0]?.profiles ?? null;
  if (!seller && !profile) return null;
  const name = seller?.company_name || profile?.full_name || profile?.username || 'Atelier';
  return { seller, listings, profile, name };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const data = await loadAtelier(id);
  if (!data) return { title: 'Atelier' };
  const description =
    data.seller?.workshop_description?.slice(0, 160) ||
    `Produse handmade lucrate de ${data.name} pe Craft'zaar.`;
  return {
    title: data.name,
    description,
    openGraph: { title: data.name, description, type: 'profile' },
  };
}

export default async function AtelierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await loadAtelier(id);
  if (!data) notFound();
  const { seller, listings, profile, name } = data;

  const verified = seller?.status === 'approved';
  const avatar = profile?.avatar_url || avatarFor(name);
  const since = seller?.created_at ?? listings[listings.length - 1]?.created_at ?? null;
  const onVacation =
    seller?.vacation_until && new Date(seller.vacation_until + 'T00:00:00') > new Date()
      ? new Date(seller.vacation_until + 'T00:00:00')
      : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 lg:px-8 pt-4 pb-16">
      <Link href="/" className="inline-flex items-center text-sm text-ink-soft hover:text-clay mb-4">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi acasă
      </Link>

      <header className="rounded-2xl border-[1.5px] border-line-strong bg-surface shadow-[4px_4px_0_0_var(--press-soft)] p-5 lg:p-7">
        <div className="flex items-start gap-4">
          <div className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-full overflow-hidden bg-cream ring-1 ring-line shrink-0">
            <Image src={avatar} alt={name} fill sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl lg:text-4xl text-ink leading-tight break-words">{name}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-sm">
              {verified && (
                <span className="inline-flex items-center gap-1 text-sage">
                  <BadgeCheck className="w-4 h-4" /> Vânzător verificat
                </span>
              )}
              {profile?.username && <span className="text-ink-faint">@{profile.username}</span>}
              {since && (
                <span className="inline-flex items-center gap-1 text-ink-faint">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Pe Craft&apos;zaar din {new Date(since).toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* The artisan's own words about their workshop. */}
        {seller?.workshop_description && (
          <p className="mt-5 text-ink-soft leading-relaxed whitespace-pre-line max-w-2xl">
            {seller.workshop_description}
          </p>
        )}

        {onVacation && (
          <p className="mt-4 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm text-ink">
            Atelierul este în vacanță până pe{' '}
            {onVacation.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' })} și nu poate
            expedia comenzi în această perioadă.
          </p>
        )}

        {verified && (seller?.contact_email || seller?.contact_phone || seller?.contact_other) && (
          <div className="mt-5 pt-4 border-t border-line flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {seller.contact_email && (
              <a href={`mailto:${seller.contact_email}`} className="inline-flex items-center gap-1.5 text-clay hover:underline">
                <Mail className="w-4 h-4" /> {seller.contact_email}
              </a>
            )}
            {seller.contact_phone && (
              <a href={`tel:${seller.contact_phone}`} className="inline-flex items-center gap-1.5 text-clay hover:underline">
                <Phone className="w-4 h-4" /> {seller.contact_phone}
              </a>
            )}
            {seller.contact_other && (
              <span className="inline-flex items-center gap-1.5 text-ink-soft">
                <Globe className="w-4 h-4" /> {seller.contact_other}
              </span>
            )}
          </div>
        )}
      </header>

      <h2 className="font-display text-xl lg:text-2xl text-ink mt-8 mb-4">
        Produse{' '}
        <span className="text-ink-faint text-base">
          ({listings.length}
          {listings.length === 60 ? '+' : ''})
        </span>
      </h2>

      {listings.length === 0 ? (
        <p className="text-ink-soft">Atelierul nu are produse disponibile momentan.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-5">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
