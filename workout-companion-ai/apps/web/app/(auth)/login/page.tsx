'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';

const labelClass =
  'mb-2 block text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';
const fieldClass = cn(inputClass, 'h-[52px] text-[17px]');

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? 'Email o password non corretti.'
          : error.message
      );
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
        Bentornato
      </h1>
      <p className="mt-2 text-[15px] leading-[1.45] text-text-secondary">
        Clienti, schede e check-in ti aspettano dove li hai lasciati.
      </p>

      <form onSubmit={handleLogin} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={cn(fieldClass, error && 'border-rose')}
            placeholder="nome@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={error ? true : undefined}
              className={cn(fieldClass, 'pr-12', error && 'border-rose')}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Nascondi la password' : 'Mostra la password'}
              className="press absolute inset-y-0 right-0 grid w-12 place-items-center rounded-sm text-text-tertiary transition hover:text-white"
            >
              {showPassword ? (
                <EyeOff size={18} aria-hidden="true" />
              ) : (
                <Eye size={18} aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-sm bg-rose/10 px-4 py-3.5 text-[15px] leading-[1.4] text-rose"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className={cn(buttonPrimary, 'h-14 w-full text-[17px]')}>
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Accesso in corso…
            </>
          ) : (
            <>
              Accedi
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[15px] text-text-secondary">
        Non hai un account?{' '}
        <Link
          href="/registrati"
          className="font-semibold text-accent transition hover:text-accent-hover"
        >
          Registrati gratis
        </Link>
      </p>
    </div>
  );
}
