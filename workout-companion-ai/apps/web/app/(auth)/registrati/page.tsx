'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'athlete'>('coach');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Imposta il ruolo scelto sul profilo (creato automaticamente da un trigger nel DB)
    if (data.user) {
      await supabase.from('profiles').update({ role }).eq('id', data.user.id);
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Crea il tuo account</h1>
      <p className="text-text-secondary text-sm mb-6">14 giorni di prova gratuita, senza carta.</p>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Nome</label>
            <input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm mb-1.5 text-text-secondary">Cognome</label>
            <input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Chi sei?</label>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ['coach', '💼 Coach / PT'],
                ['athlete', '🏋️ Atleta'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                className={`rounded-lg border py-2.5 text-sm font-medium transition ${
                  role === value
                    ? 'border-accent bg-accent/10 text-text-primary'
                    : 'border-border text-text-secondary hover:bg-card-hover'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5 text-text-secondary">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 focus:outline-none focus:border-accent"
            placeholder="Minimo 8 caratteri"
          />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-accent hover:bg-accent-hover transition rounded-lg py-2.5 font-semibold disabled:opacity-50"
        >
          {loading ? 'Creazione account…' : 'Crea account'}
        </button>
      </form>

      <p className="text-sm text-text-secondary mt-6 text-center">
        Hai già un account?{' '}
        <Link href="/login" className="text-accent hover:underline">
          Accedi
        </Link>
      </p>
    </div>
  );
}
