'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Camera } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSession } from '@/lib/hooks';
import { useAuthModal } from '@/lib/auth-modal';
import { fetchProfile } from '@/lib/data/listings';
import { updateProfile } from '@/actions/profile';
import { avatarFor } from '@/lib/mock';

export default function EditProfilePage() {
  const { user, loading: sessionLoading } = useSession();
  const { setOpen } = useAuthModal();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessionLoading || !user) return;
    fetchProfile(user.id).then((p) => {
      setUsername(p?.username ?? '');
      setFullName(p?.full_name ?? '');
      setAvatarUrl(p?.avatar_url ?? null);
      setLoaded(true);
    });
  }, [user, sessionLoading]);

  if (!sessionLoading && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <h1 className="font-display text-2xl text-ink mb-2">Editează profilul</h1>
        <p className="text-ink-soft mb-6 max-w-xs">Autentifică-te pentru a-ți edita profilul.</p>
        <Button className="rounded-full" onClick={() => setOpen(true)}>Autentificare</Button>
      </div>
    );
  }

  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setAvatarPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const fd = new FormData();
    fd.append('username', username);
    fd.append('full_name', fullName);
    const file = fileRef.current?.files?.[0];
    if (file) fd.append('avatar', file);

    const res = await updateProfile(fd);
    if ('error' in res && res.error) {
      setError(res.error);
      setSaving(false);
      return;
    }
    router.push('/profile');
    router.refresh();
  };

  const shownAvatar = avatarPreview ?? avatarUrl ?? avatarFor(fullName || username || 'Utilizator');

  return (
    <div className="min-h-screen px-4 py-6 pb-24 mx-auto w-full max-w-2xl">
      <Link href="/profile" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la profil
      </Link>
      <h1 className="font-display text-2xl text-ink mb-6">Editează profilul</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
                {error}
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative w-24 h-24 rounded-full overflow-hidden ring-4 ring-cream bg-cream grid place-items-center group"
                aria-label="Schimbă poza de profil"
              >
                <Image src={shownAvatar} alt="" fill sizes="96px" className="object-cover" />
                <span className="absolute inset-0 grid place-items-center bg-ink/40 text-paper opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-6 h-6" />
                </span>
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={handleAvatarPick} />
              <span className="text-xs text-ink-soft">Apasă pe imagine pentru a schimba poza</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink" htmlFor="username">Nume de utilizator</label>
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: deco_kubik" disabled={!loaded} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-ink" htmlFor="full_name">Nume complet</label>
              <Input id="full_name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="ex: Deco Kubik" disabled={!loaded} />
            </div>

            <Button type="submit" className="w-full rounded-full" disabled={saving || !loaded}>
              {saving ? 'Se salvează…' : 'Salvează modificările'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
