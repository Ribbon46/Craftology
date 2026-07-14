'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Tag, Check, Eye, X, ImagePlus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { CATEGORIES, SUBCATEGORIES, type CategoryKey } from '@/config/app';
import { useSession } from '@/lib/hooks';
import { fetchListingById } from '@/lib/data/listings';
import { updateListing, updateListingPhotos } from '@/actions/listings';
import type { Listing } from '@/lib/mock';

// Browser-side photo compression (same pipeline as the sell form) so new
// photos fit under the 4MB server-action body cap.
async function compressPhoto(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  if (file.size <= 400 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * scale));
    canvas.height = Math.max(1, Math.round(bmp.height * scale));
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.82));
    if (blob && blob.size < file.size) {
      return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
    }
  } catch { /* fall back to the original */ }
  return file;
}

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
  const [keepUrls, setKeepUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const originalUrls = useRef<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
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
          setKeepUrls(l.image_urls ?? []);
          originalUrls.current = l.image_urls ?? [];
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoaded(true));
  }, [id]);

  const priceNum = parseFloat(price) || 0;
  const pct = Math.min(90, Math.max(0, parseInt(discountPct, 10) || 0));
  const finalPrice = useMemo(() => (pct > 0 ? Math.round(priceNum * (1 - pct / 100)) : priceNum), [priceNum, pct]);

  const photosChanged =
    newFiles.length > 0 ||
    keepUrls.length !== originalUrls.current.length ||
    keepUrls.some((u, i) => originalUrls.current[i] !== u);

  const save = async () => {
    setError(null);
    if (pct > 0 && finalPrice < 1) {
      setError('Prețul redus trebuie să fie cel puțin 1 leu.');
      return;
    }
    if (keepUrls.length + newFiles.length < 1) {
      setError('Produsul trebuie să aibă cel puțin o fotografie.');
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
      if (photosChanged) {
        const fd = new FormData();
        fd.append('keep', JSON.stringify(keepUrls));
        const compressed = await Promise.all(newFiles.map(compressPhoto));
        compressed.forEach((f) => fd.append('images', f));
        const pres = await updateListingPhotos(id, fd);
        if (pres && 'error' in pres && pres.error) {
          setError(`Detaliile s-au salvat, dar fotografiile nu: ${pres.error}`);
          return;
        }
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

          {/* Photos: remove existing / add new (compressed in-browser) */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Fotografii ({keepUrls.length + newFiles.length}/10)
            </label>
            <div className="flex flex-wrap gap-2">
              {keepUrls.map((url) => (
                <div key={url} className="relative w-20 h-20 rounded-xl overflow-hidden border border-line bg-cream">
                  <Image src={url} alt="" fill sizes="80px" className="object-cover" />
                  <button
                    type="button"
                    aria-label="Elimină fotografia"
                    onClick={() => setKeepUrls((prev) => prev.filter((u) => u !== url))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink/70 text-paper grid place-items-center hover:bg-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {newFiles.map((f, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-sage/60 bg-cream">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    aria-label="Elimină fotografia nouă"
                    onClick={() => setNewFiles((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-ink/70 text-paper grid place-items-center hover:bg-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {keepUrls.length + newFiles.length < 10 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-line-strong text-ink-faint hover:border-clay/45 hover:text-clay grid place-items-center transition-colors"
                >
                  <ImagePlus className="w-6 h-6" />
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setNewFiles((prev) => [...prev, ...files].slice(0, 10 - keepUrls.length));
                if (fileRef.current) fileRef.current.value = '';
              }}
            />
            <p className="text-xs text-ink-faint">Prima fotografie este cea principală. Pozele noi (contur verde) se încarcă la salvare.</p>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/listings/${id}?preview=1`}
              target="_blank"
              className="flex items-center justify-center gap-1.5 h-12 px-5 rounded-full border-[1.5px] border-line-strong text-ink-soft text-sm font-medium hover:border-clay/45 hover:text-clay transition-colors shrink-0"
            >
              <Eye className="w-4 h-4" /> Previzualizează
            </Link>
            <Button className="flex-1 h-12" disabled={saving} onClick={save}>
              {saving ? 'Se salvează…' : 'Salvează modificările'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
