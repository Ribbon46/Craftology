'use client';

import { useState, useRef, useCallback } from 'react';
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
import { CATEGORIES } from '@/config/app';
import { createListing } from '@/actions/listings';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SellPage() {
  const { user, loading } = useSession();
  const { setOpen } = useAuthModal();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
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
      
      files.forEach((file) => {
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
      setFiles([]);
      
      setTimeout(() => {
        setSuccess(false);
        router.push('/');
      }, 2000);
    } catch (err) {
      setError('A apărut o erorie la publicarea produsului');
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-ink-soft">Se încarcă...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center py-8 max-w-xs">
          <h2 className="text-2xl font-bold text-ink mb-4">Autentificare necesară</h2>
          <p className="text-ink-soft mb-6">Trebuie să fii autentificat pentru a vinde produse.</p>
          <Button className="w-full mb-3" onClick={() => setOpen(true)}>
            Autentificare
          </Button>
          <Link href="/" className="text-sm text-ink-soft hover:text-ink underline">
            Înapoi la feed
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4 pb-20">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-ink mb-2">Produs adăugat!</h2>
          <p className="text-ink-soft">Produsul tău a fost publicat cu succes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 pt-4 mx-auto w-full max-w-2xl">
      <div className="px-4 mb-6">
        <h1 className="text-2xl font-bold text-ink">Vinde un produs</h1>
        <p className="text-ink-soft mt-1">Completează informațiile produsului tău handmade</p>
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
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

              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="category">Categorie *</label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-line-strong bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-ink focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  placeholder="Descrie materialul, dimensiunile, condițiile de întreținere..."
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Publică produsul...
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