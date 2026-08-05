'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  Dumbbell,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { buttonPrimary, inputClass } from '@/components/ui';
import { cn } from '@/lib/utils';

const labelClass =
  'mb-2 block text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary';
const fieldClass = cn(inputClass, 'h-[52px] text-[17px]');

/** Le due identità del prodotto. Icone, mai emoji, sui controlli. */
const ROLES = [
  { value: 'coach', label: 'Coach / PT', icon: Briefcase },
  { value: 'athlete', label: 'Atleta', icon: Dumbbell },
] as const;

const CONFIRM_STEPS = [
  'Apri la tua casella di posta (controlla anche lo spam).',
  'Clicca il pulsante di conferma nel messaggio.',
  'Ti portiamo dritto in dashboard, già connesso.',
];

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        <span className="grid h-12 w-12 place-items-center rounded-sm bg-mint/15 text-mint">
          <MailCheck size={24} aria-hidden="true" />
        </span>

        <h1 className="mt-5 text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
          Controlla la tua email
        </h1>
        <p className="mt-2 text-[15px] leading-[1.45] text-text-secondary">
          Abbiamo inviato il link di conferma a{' '}
          <span className="font-semibold text-white">{email}</span>.
        </p>

        <ol className="mt-6 space-y-2">
          {CONFIRM_STEPS.map((step, i) => (
            <li
              key={step}
              className="flex min-h-[56px] items-center gap-3 rounded-sm bg-raised px-4 py-3"
            >
              <span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-background text-[13px] font-bold text-text-secondary">
                {i + 1}
              </span>
              <span className="text-[15px] leading-[1.4] text-text-secondary">{step}</span>
            </li>
          ))}
        </ol>

        <p className="mt-7 text-center text-[15px] text-text-secondary">
          Hai già confermato?{' '}
          <Link
            href="/login"
            className="font-semibold text-accent transition hover:text-accent-hover"
          >
            Accedi
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em] text-white">
        Crea il tuo account
      </h1>
      <p className="mt-2 text-[15px] leading-[1.45] text-text-secondary">
        14 giorni di prova gratuita, senza carta di credito.
      </p>

      <form onSubmit={handleRegister} className="mt-8 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={labelClass}>
              Nome
            </label>
            <input
              id="firstName"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={labelClass}>
              Cognome
            </label>
            <input
              id="lastName"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <p className={labelClass} id="role-label">
            Chi sei?
          </p>
          <div className="grid grid-cols-2 gap-3" role="group" aria-labelledby="role-label">
            {ROLES.map((r) => {
              const selected = role === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  aria-pressed={selected}
                  className={cn(
                    'press flex min-h-[76px] flex-col justify-between rounded-sm border p-3.5 text-left transition',
                    selected
                      ? 'border-accent bg-accent/10'
                      : 'border-transparent bg-raised hover:bg-[#252E3E]'
                  )}
                >
                  <span className="flex w-full items-center justify-between">
                    <r.icon
                      size={20}
                      className={selected ? 'text-accent' : 'text-text-tertiary'}
                      aria-hidden="true"
                    />
                    {selected && <Check size={16} className="text-accent" aria-hidden="true" />}
                  </span>
                  <span
                    className={cn(
                      'mt-2 text-[15px] font-bold',
                      selected ? 'text-white' : 'text-text-secondary'
                    )}
                  >
                    {r.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
            className={fieldClass}
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(fieldClass, 'pr-12')}
              placeholder="••••••••"
              aria-describedby="password-hint"
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
          <p id="password-hint" className="mt-2 text-[13px] text-text-tertiary">
            Almeno 8 caratteri.
          </p>
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

        <button
          type="submit"
          disabled={loading}
          className={cn(buttonPrimary, 'h-14 w-full text-[17px]')}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              Creazione account…
            </>
          ) : (
            <>
              Crea account
              <ArrowRight size={18} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-7 text-center text-[15px] text-text-secondary">
        Hai già un account?{' '}
        <Link href="/login" className="font-semibold text-accent transition hover:text-accent-hover">
          Accedi
        </Link>
      </p>
    </div>
  );
}
