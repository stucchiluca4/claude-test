'use client';

import { useState } from 'react';
import { Card, buttonPrimary, buttonSecondary } from '@/components/ui';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Lock } from 'lucide-react';

const PLANS = [
  {
    key: 'coach_starter',
    name: 'Coach Starter',
    price: '29€',
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_STARTER,
    features: ['Fino a 15 clienti', 'Programmi illimitati', 'Nutrizione', 'Chat', 'Check-in'],
  },
  {
    key: 'coach_pro',
    name: 'Coach Pro',
    price: '69€',
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_PRO,
    features: ['Fino a 50 clienti', 'Tutto di Starter', 'AI Coach & report', 'Analytics avanzate'],
    highlight: true,
  },
  {
    key: 'coach_elite',
    name: 'Coach Elite',
    price: '129€',
    priceEnv: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_ELITE,
    features: ['Clienti illimitati', 'Tutto di Pro', 'White label (v2)', 'Supporto prioritario'],
  },
];

/** Ritardi scalati: i piani entrano da sinistra a destra. */
const RISE_DELAY = ['rise-1', 'rise-2', 'rise-3'];

export function PlanButtons({ hasSubscription }: { hasSubscription: boolean }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /** Apre il checkout Stripe (o il portale clienti se già abbonato). */
  async function goToCheckout(planKey: string, priceId?: string) {
    setLoading(planKey);
    setError(null);
    try {
      const res = await fetch(hasSubscription ? '/api/stripe/portal' : '/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey, priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Errore imprevisto. Stripe è configurato? (vedi .env)');
      }
    } catch {
      setError('Errore di rete.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <section aria-label="Piani disponibili">
      <h2 className="mb-3 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
        Piani disponibili
      </h2>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {PLANS.map((p, i) => (
          <Card
            key={p.key}
            beacon={p.highlight}
            className={cn('relative flex flex-col rise', RISE_DELAY[i])}
          >
            {p.highlight && (
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em] text-white">
                Più scelto
              </span>
            )}

            <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
              {p.name}
            </h3>

            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-metric tnum text-[44px] font-extrabold leading-none text-white">
                {p.price}
              </span>
              <span className="text-[15px] font-semibold text-text-secondary">/mese</span>
            </div>

            <ul className="mt-6 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[15px] text-text-secondary">
                  <Check size={17} className="mt-0.5 shrink-0 text-mint" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <button
                onClick={() => goToCheckout(p.key, p.priceEnv)}
                disabled={loading !== null}
                className={cn(p.highlight ? buttonPrimary : buttonSecondary, 'w-full')}
              >
                {loading === p.key
                  ? 'Apertura…'
                  : hasSubscription
                    ? 'Gestisci abbonamento'
                    : 'Prova gratis 14 giorni'}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 flex items-start gap-2.5 rounded-sm bg-rose/10 px-4 py-3 text-[14px] font-semibold text-rose"
        >
          <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}

      <p className="mt-5 flex items-center gap-2 text-[13px] text-text-secondary">
        <Lock size={15} aria-hidden />
        Pagamenti sicuri con Stripe. Disdici quando vuoi dal portale clienti.
      </p>
    </section>
  );
}
