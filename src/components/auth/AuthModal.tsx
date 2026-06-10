'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthModal } from '@/lib/auth-modal';

export function AuthModal() {
  const { open, setOpen } = useAuthModal();
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const reset = () => {
    setError(null);
    setInfo(null);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!email.trim() || !password.trim()) {
      setError('Completează emailul și parola.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { error: authError } = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isLogin) {
      setOpen(false);
      router.refresh();
    } else {
      // Supabase sends a confirmation email by default.
      setInfo('Cont creat! Verifică-ți emailul pentru confirmare, apoi autentifică-te.');
      setIsLogin(true);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md p-6">
        <DialogHeader className="pr-6">
          <DialogTitle className="font-display text-xl">
            {isLogin ? 'Bine ai venit la Craftology' : 'Creează un cont'}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {isLogin
              ? 'Accesează-ți contul pentru a vinde și cumpăra produse handmade.'
              : 'Înregistrează-te pentru a începe să vinzi produse handmade românești.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-2">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/25 text-destructive text-sm">
              {error}
            </div>
          )}
          {info && (
            <div className="mb-4 p-3 rounded-xl bg-sage/15 border border-sage/30 text-sage text-sm">
              {info}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium">Nume complet</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-5 w-5 text-ink-faint" />
                <Input
                  type="text"
                  placeholder="Ion Popescu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-ink-faint" />
              <Input
                type="email"
                placeholder="nume@exemplu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <label className="text-sm font-medium">Parolă</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-ink-faint" />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-ink-faint hover:text-ink-soft"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading
              ? 'Se procesează…'
              : isLogin
                ? 'Autentificare'
                : 'Creează cont'}
          </Button>

          <p className="mt-4 text-center text-sm text-ink-soft">
            {isLogin ? 'Nu ai cont? ' : 'Ai deja cont? '}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                reset();
              }}
              className="text-ink font-medium hover:underline"
            >
              {isLogin ? 'Înregistrează-te' : 'Autentifică-te'}
            </button>
          </p>
        </form>

        <p className="text-center text-xs leading-relaxed text-ink-soft text-pretty px-1">
          Continuând, ești de acord cu{' '}
          <Link
            href="/terms"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="text-ink underline underline-offset-2 hover:text-clay"
          >
            Termenii
          </Link>{' '}
          și{' '}
          <Link
            href="/privacy"
            onClick={() => {
              setOpen(false);
              reset();
            }}
            className="text-ink underline underline-offset-2 hover:text-clay"
          >
            Politica de confidențialitate
          </Link>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}
