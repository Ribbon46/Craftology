'use client';

import { useState, useCallback, useEffect } from 'react';
import { Check, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dropzone } from '@/components/ui/Dropzone';
import { CATEGORIES, SUBCATEGORIES, type CategoryKey } from '@/config/app';
import { createListing } from '@/actions/listings';
import { canSell, type SellEligibility } from '@/actions/seller';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellPage() {
  const { user, loading } = useSession();
  const { setOpen } = useAuthModal();
  const router = useRouter();
  const [eligibility, setEligibility] = useState<{ canSell: boolean; reason: SellEligibility } | null>(null);

  useEffect(() => {
    if (!user) return;
    setEligibility(null);
    // One retry, then fail CLOSED with a visible message instead of spinning
    // forever (an unhandled rejection here left the page stuck on the loader).
    canSell()
      .then(setEligibility)
      .catch(() =>
        canSell()
          .then(setEligibility)
          .catch(() => setError('Nu am putut verifica contul tău. Reîncarcă pagina.')),
      );
  }, [user]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleFilesRemoved = useCallback((removedFiles: File[]) => {
    setFiles((prev) => prev.filter((f) => !removedFiles.includes(f)));
  }, []);

  // Downscale a photo in the browser (max edge 1600px, JPEG) so 5 phone photos
  // (2–8 MB each) fit under the server action's 4 MB body cap. Mirrors the
  // server-side sharp resize; falls back to the original on any failure.
  const compressImage = async (file: File): Promise<File> => {
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
    } catch {
      // canvas/bitmap unsupported → send the original
    }
    return file;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validate required fields
    if (!title.trim()) {
      setError('Vă rugăm să adăugați un titlu');
      setIsSubmitting(false);
      return;
    }
    if (!category) {
      setError('Vă rugăm să selectați o categorie');
      setIsSubmitting(false);
      return;
    }
    if (!subcategory) {
      setError('Vă rugăm să selectați o subcategorie');
      setIsSubmitting(false);
      return;
    }
    const priceNum = parseFloat(price);
    if (!priceNum || priceNum < 1) {
      setError('Vă rugăm să adăugați un preț valid');
      setIsSubmitting(false);
      return;
    }
    if (files.length === 0) {
      setError('Vă rugăm să încărcați cel puțin o imagine');
      setIsSubmitting(false);
      return;
    }
    if (files.length > 5) {
      setError('Poți încărca maxim 5 imagini');
      setIsSubmitting(false);
      return;
    }

    // Check file sizes (max 5MB each)
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Fișierul ${file.name} este prea mare (max 5MB)`);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('price', price);
      formData.append('category', category);
      formData.append('subcategory', subcategory);

      const compressed = await Promise.all(files.map(compressImage));
      const totalBytes = compressed.reduce((s, f) => s + f.size, 0);
      if (totalBytes > 3.8 * 1024 * 1024) {
        setError('Fotografiile sunt prea mari împreună. Încearcă cu mai puține imagini sau imagini mai mici.');
        setIsSubmitting(false);
        return;
      }
      compressed.forEach((file) => {
        formData.append('images', file);
      });

      const result = await createListing(formData);

      if (result.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory('');
      setSubcategory('');
      setFiles([]);
      
      setTimeout(() => {
        setSuccess(false);
        router.push('/');
      }, 2000);
    } catch (err) {
      // A 413 here means the upload was still too large for the server.
      setError(
        'A apărut o eroare la publicarea produsului. Dacă se repetă, încearcă cu mai puține fotografii sau fotografii mai mici.',
      );
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="flex flex-col items-center text-center py-8 max-w-xs">
          <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4 -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
            <Store className="w-7 h-7 text-clay" strokeWidth={2.25} />
          </div>
          <h2 className="font-display text-2xl text-ink mb-4">Autentificare necesară</h2>
          <p className="text-ink-soft mb-6">Trebuie să fii autentificat pentru a vinde produse.</p>
          <Button className="w-full mb-3" onClick={() => setOpen(true)}>
            Autentificare
          </Button>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink underline">
            Înapoi acasă
          </Link>
        </div>
      </div>
    );
  }

  if (!eligibility) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center gap-4">
        {error ? (
          <>
            <p className="text-ink-soft max-w-xs">{error}</p>
            <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
              Reîncearcă
            </Button>
          </>
        ) : (
          <div className="w-6 h-6 border-2 border-clay border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    );
  }
  if (!eligibility.canSell) {
    return <SellGate reason={eligibility.reason} />;
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-20">
        <div className="text-center py-12 animate-float-in">
          <div className="w-16 h-16 bg-sage/15 text-sage rounded-full grid place-items-center mx-auto mb-4">
            <Check className="w-8 h-8" strokeWidth={2.5} />
          </div>
          <h2 className="font-display text-2xl text-ink mb-2">Produs adăugat!</h2>
          <p className="text-ink-soft">Produsul tău a fost publicat cu succes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-2xl">
      <div className="px-4 mb-6">
        <h1 className="font-display text-2xl text-ink">Vinde un produs</h1>
        <p className="text-sm text-ink-soft mt-1">Completează informațiile produsului tău handmade</p>
      </div>

      <div className="px-4">
        <Card>
          <CardHeader>
            <CardTitle>Detalii produs</CardTitle>
            <CardDescription>
              Descrie produsul tău pentru a atrage cumpărători
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="title">Titlu *</label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Ex: Colier Mărgele Colorate - Handmade"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
                <p className="text-xs text-ink-soft">Titlul trebuie să aibă cel puțin 3 caractere</p>
              </div>

              {/* Category + dependent subcategory */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="category">Categorie *</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setSubcategory(''); // reset — subcategories depend on the category
                    }}
                    className="flex h-10 w-full rounded-lg border-[1.5px] border-input bg-surface px-3 py-2 text-sm placeholder:text-ink-faint transition-[border-color,box-shadow] focus:outline-none focus:border-clay focus:shadow-[3px_3px_0_0_var(--focus-press)] disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">Selectează o categorie</option>
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="subcategory">Subcategorie *</label>
                  <select
                    id="subcategory"
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    disabled={!category}
                    className="flex h-10 w-full rounded-lg border-[1.5px] border-input bg-surface px-3 py-2 text-sm placeholder:text-ink-faint transition-[border-color,box-shadow] focus:outline-none focus:border-clay focus:shadow-[3px_3px_0_0_var(--focus-press)] disabled:cursor-not-allowed disabled:opacity-50"
                    required
                  >
                    <option value="">{category ? 'Selectează o subcategorie' : 'Alege întâi categoria'}</option>
                    {category &&
                      SUBCATEGORIES[category as CategoryKey].map((sub) => (
                        <option key={sub} value={sub}>
                          {sub}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="price">Preț în RON *</label>
                <div className="relative">
                  <Input
                    id="price"
                    type="number"
                    placeholder="Ex: 85"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    min="0"
                    step="0.01"
                    required
                    className="pl-8"
                  />
                  <span className="absolute left-3 top-2.5 text-ink-soft">lei</span>
                </div>
                <p className="text-xs text-ink-soft">Prețul trebuie să fie cel puțin 1 leu</p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="description">Descriere *</label>
                <Textarea
                  id="description"
                  placeholder="Descrie materialul, dimensiunile, condițiile de întreținere…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  required
                  className="resize-none"
                />
                <p className="text-xs text-ink-soft">Descrierea trebuie să aibă cel puțin 20 de caractere</p>
              </div>

              {/* Images */}
              <Dropzone
                onFilesAdded={handleFilesAdded}
                onFilesRemoved={handleFilesRemoved}
                maxFiles={5}
                maxFileSize={5 * 1024 * 1024}
              />

              {/* Submit */}
              <Button type="submit" className="w-full h-12 text-lg" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="w-5 h-5 border-2 border-paper border-t-transparent rounded-full animate-spin mr-2"></div>
                    Se publică…
                  </div>
                ) : (
                  'Publică produsul'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SellGate({ reason }: { reason: SellEligibility }) {
  const map: Record<SellEligibility, { title: string; body: string; cta: string }> = {
    ok: { title: '', body: '', cta: '' },
    auth: { title: 'Autentificare necesară', body: 'Autentifică-te pentru a vinde.', cta: 'Înapoi acasă' },
    not_seller: { title: 'Devino vânzător', body: 'Pentru a publica produse, trimite o cerere de vânzător.', cta: 'Trimite o cerere' },
    pending: { title: 'Cerere în verificare', body: 'Cererea ta de vânzător este în curs de verificare. Revino după aprobare.', cta: 'Vezi statusul' },
    rejected: { title: 'Cerere respinsă', body: 'Cererea ta de vânzător a fost respinsă.', cta: 'Vezi detalii' },
    suspended: { title: 'Cont suspendat', body: 'Contul tău de vânzător este suspendat.', cta: 'Vezi detalii' },
    not_onboarded: { title: 'Configurează plățile', body: 'Finalizează configurarea plăților prin Stripe pentru a putea publica produse.', cta: 'Configurează plățile' },
  };
  const m = map[reason];
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center">
      <div className="flex flex-col items-center max-w-xs">
        <div className="w-16 h-16 rounded-full bg-clay-soft grid place-items-center mb-4 -rotate-3 border-[1.5px] border-clay/35 shadow-[3px_3px_0_0_var(--press-soft)]">
          <Store className="w-7 h-7 text-clay" strokeWidth={2.25} />
        </div>
        <h2 className="font-display text-2xl text-ink mb-3">{m.title}</h2>
        <p className="text-ink-soft mb-6">{m.body}</p>
        <Link href="/seller/apply">
          <Button className="w-full rounded-full mb-3">{m.cta}</Button>
        </Link>
        <Link href="/" className="text-sm text-ink-soft hover:text-ink underline">Înapoi acasă</Link>
      </div>
    </div>
  );
}