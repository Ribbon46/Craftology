'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Tag, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CATEGORIES, SUBCATEGORIES, type CategoryKey } from '@/config/app';
import { useSession } from '@/lib/hooks';
import { fetchListingById } from '@/lib/data/listings';
import { updateListing } from '@/actions/listings';
import type { Listing } from '@/lib/mock';

// Owner-only listing editor: modify title/description/price/category and offer
// a discount ("oferă discount"). Photos aren't editable in v1.
export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [discountPct, setDiscountPct] = useState(''); // '' = no discount
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchListingById(id)
      .then((l) => {
        setListing(l);
        if (l) {
          setTitle(l.title);
          setDescription(l.description);
          setCategory(l.category);
          setSubcategory(l.subcategory ?? '');
          // If a discount is active, the editable "price" is the ORIGINAL and
          // the percent reflects the current reduction.
          if (l.original_price && l.original_price > l.price) {
            setPrice(String(l.original_price));
            setDiscountPct(String(Math.round((1 - l.price / l.original_price) * 100)));
          } else {
            setPrice(String(l.price));
          }
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoaded(true));
  }, [id]);

  const priceNum = parseFloat(price) || 0;
  const pct = Math.min(90, Math.max(0, parseInt(discountPct, 10) || 0));
  const finalPrice = useMemo(() => (pct > 0 ? Math.round(priceNum * (1 - pct / 100)) : priceNum), [priceNum, pct]);

  const save = async () => {
    setError(null);
    if (pct > 0 && finalPrice < 1) {
      setError('Prețul redus trebuie să fie cel puțin 1 leu.');
      return;
    }
    setSaving(true);
    try {
      const res = await updateListing(id, {
        title,
        description,
        price: pct > 0 ? finalPrice : priceNum,
        category,
        subcategory,
        originalPrice: pct > 0 ? priceNum : null,
      });
      if (res && 'error' in res && res.error) {
        const details = 'details' in res && res.details ? Object.values(res.details as Record<string, string[]>).flat() : [];
        setError(details[0] ?? String(res.error));
        return;
      }
      setSaved(true);
      setTimeout(() => router.push(`/listings/${id}`), 1200);
    } catch {
      setError('Salvarea nu a reușit. Încearcă din nou.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded || sessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!listing) {
    return <p className="text-center text-ink-soft py-20">Anunțul nu a fost găsit.</p>;
  }
  if (!user || user.id !== listing.seller_id) {
    return <p className="text-center text-ink-soft py-20">Doar vânzătorul acestui produs îl poate modifica.</p>;
  }
  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 bg-sage/15 text-sage rounded-full grid place-items-center mb-4">
          <Check className="w-8 h-8" strokeWidth={2.5} />
        </div>
        <h2 className="font-display text-2xl text-ink">Modificările au fost salvate!</h2>
      </div>
    );
  }

  const selectCls =
    'flex h-10 w-full rounded-lg border-[1.5px] border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:border-clay';

  return (
    <div className="min-h-screen pb-24 pt-4 mx-auto w-full max-w-2xl px-4">
      <Link href={`/listings/${id}`} className="inline-flex items-center text-sm text-ink-soft hover:text-clay mb-4">
        <ArrowLeft className="w-4 h-4 mr-1.5" /> Înapoi la produs
      </Link>
      <h1 className="font-display text-2xl text-ink mb-5">Modifică produsul</h1>

      <Card>
        <CardContent className="p-5 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">{error}</div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Titlu *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            <p className="text-xs text-ink-soft">{title.length}/100</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Categorie *</label>
              <select
                className={selectCls}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory('');
                }}
              >
                {Object.keys(CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Subcategorie *</label>
              <select className={selectCls} value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">Alege…</option>
                {category &&
                  SUBCATEGORIES[category as CategoryKey]?.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Preț în RON *</label>
            <Input type="number" min="1" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>

          {/* Discount */}
          <div className="rounded-xl border-[1.5px] border-clay/35 bg-clay-soft/30 p-4">
            <p className="flex items-center gap-1.5 font-medium text-ink text-sm mb-1">
              <Tag className="w-4 h-4 text-clay" /> Oferă discount
            </p>
            <p className="text-xs text-ink-soft mb-3">
              Reducere față de prețul de mai sus. Cumpărătorii văd prețul vechi tăiat și eticheta de reducere.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {[10, 20, 30].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDiscountPct(discountPct === String(p) ? '' : String(p))}
                  className={`px-3.5 py-1.5 rounded-full text-sm border-[1.5px] transition-colors ${
                    discountPct === String(p) ? 'bg-clay text-paper border-clay' : 'border-line-strong text-ink-soft hover:border-clay/45'
                  }`}
                >
                  -{p}%
                </button>
              ))}
              <Input
                type="number"
                min="0"
                max="90"
                placeholder="alt %"
                value={discountPct}
                onChange={(e) => setDiscountPct(e.target.value)}
                className="w-24 h-9"
              />
              {pct > 0 && (
                <span className="text-sm text-ink">
                  → <s className="text-ink-faint">{priceNum} lei</s>{' '}
                  <strong className="text-clay price">{finalPrice} lei</strong>
                </span>
              )}
              {pct > 0 && (
                <button type="button" onClick={() => setDiscountPct('')} className="text-xs text-ink-faint underline underline-offset-2">
                  Elimină discountul
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Descriere *</label>
            <Textarea rows={7} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={3000} className="resize-none" />
            <p className="text-xs text-ink-soft">{description.length}/3000</p>
          </div>

          <p className="text-xs text-ink-faint">
            Fotografiile nu pot fi modificate aici deocamdată — pentru poze noi, șterge produsul și publică-l din nou.
          </p>

          <Button className="w-full h-12" disabled={saving} onClick={save}>
            {saving ? 'Se salvează…' : 'Salvează modificările'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
