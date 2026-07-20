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
  const [emailSent, setEmailSent] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // Il ruolo viaggia nei metadati: lo legge il trigger del DB alla creazione
    // del profilo, così vale anche quando serve la conferma via email.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName, role },
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });

    if (error) {
      setError(
        error.message === 'User already registered'
          ? 'Esiste già un account con questa email. Prova ad accedere.'
          : error.message
      );
      setLoading(false);
      return;
    }

    if (data.session) {
      // Conferma email disattivata: sei già dentro
      router.push('/dashboard');
      router.refresh();
      return;
    }

    // Conferma email attiva: l'accesso avverrà dal link ricevuto via email
    setEmailSent(true);
    setLoading(false);
  }

  if (emailSent) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-1">Controlla la tua email 📬</h1>
        <p className="text-text-secondary text-sm mb-6">
          Ti abbiamo inviato un messaggio a <span className="text-text-primary font-medium">{email}</span>.
        </p>
        <div className="bg-card border border-border rounded-lg p-4 text-sm text-text-secondary space-y-2">
          <p>1. Apri la tua casella di posta (controlla anche lo spam).</p>
          <p>2. Clicca il pulsante di conferma nel messaggio.</p>
          <p>3. Verrai portato direttamente alla tua dashboard, già connesso.</p>
        </div>
        <p className="text-sm text-text-secondary mt-6 text-center">
          Hai già confermato?{' '}
          <Link href="/login" className="text-accent hover:underline">
            Accedi
          </Link>
        </p>
      </div>
    );
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
          className="w-full grad-primary hover:brightness-110 transition rounded-lg py-2.5 font-bold text-white disabled:opacity-50 shadow-[0_0_20px_-8px_rgba(56,189,248,.7)]"
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
