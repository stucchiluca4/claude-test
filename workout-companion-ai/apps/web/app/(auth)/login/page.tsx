'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      <h1 className="text-2xl font-bold mb-1">Bentornato 👋</h1>
      <p className="text-text-secondary text-sm mb-6">Accedi al tuo portale coach.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
            placeholder="nome@email.com"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-hover transition rounded-lg py-2.5 font-semibold disabled:opacity-50"
        >
          {loading ? 'Accesso in corso…' : 'Accedi'}
        </button>
      </form>

      <p className="text-sm text-text-secondary mt-6 text-center">
        Non hai un account?{' '}
        <Link href="/registrati" className="text-accent hover:underline">
          Registrati gratis
        </Link>
      </p>
    </div>
  );
}
