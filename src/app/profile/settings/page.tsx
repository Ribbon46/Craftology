'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut, User, Bell, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from '@/lib/hooks';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export default function SettingsPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen px-4 py-6 pb-24">
      <Link href="/profile" className="inline-flex items-center text-ink-soft hover:text-ink mb-4">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Înapoi la profil
      </Link>
      <h1 className="text-2xl font-bold text-ink mb-6">Setări</h1>

      <div className="space-y-3">
        <Card>
          <CardContent className="p-0 divide-y divide-cream">
            <button className="w-full flex items-center px-4 py-4 text-left hover:bg-cream transition-colors">
              <User className="w-5 h-5 text-ink-soft mr-3" />
              <span className="flex-1 text-ink">Editează profilul</span>
            </button>
            <button className="w-full flex items-center px-4 py-4 text-left hover:bg-cream transition-colors">
              <Bell className="w-5 h-5 text-ink-soft mr-3" />
              <span className="flex-1 text-ink">Notificări</span>
            </button>
            <button className="w-full flex items-center px-4 py-4 text-left hover:bg-cream transition-colors">
              <Shield className="w-5 h-5 text-ink-soft mr-3" />
              <span className="flex-1 text-ink">Confidențialitate și securitate</span>
            </button>
          </CardContent>
        </Card>

        {!loading && user ? (
          <Button
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Deconectare
          </Button>
        ) : (
          <p className="text-center text-sm text-ink-soft py-2">
            {isSupabaseConfigured()
              ? 'Nu ești autentificat.'
              : 'Mod demo — conectează Supabase pentru conturi reale.'}
          </p>
        )}
      </div>
    </div>
  );
}
