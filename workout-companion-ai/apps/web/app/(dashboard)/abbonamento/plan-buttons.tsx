'use client';

import { useState } from 'react';
import { Card, buttonPrimary, buttonSecondary } from '@/components/ui';

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
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((p) => (
          <Card
            key={p.key}
            className={p.highlight ? 'border-accent relative' : ''}
          >
            {p.highlight && (
              <span className="absolute -top-2.5 left-4 grad-primary text-white text-xs font-bold px-2 py-0.5 rounded-md">
                Più scelto
              </span>
            )}
            <h3 className="font-semibold">{p.name}</h3>
            <div className="text-3xl font-bold mt-2">
              {p.price}
              <span className="text-sm text-text-secondary font-normal">/mese</span>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-text-secondary">
              {p.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            <button
              onClick={() => goToCheckout(p.key, p.priceEnv)}
              disabled={loading !== null}
              className={(p.highlight ? buttonPrimary : buttonSecondary) + ' w-full mt-5'}
            >
              {loading === p.key
                ? 'Apertura…'
                : hasSubscription
                  ? 'Gestisci abbonamento'
                  : 'Prova gratis 14 giorni'}
            </button>
          </Card>
        ))}
      </div>
      {error && <p className="text-danger text-sm mt-4">{error}</p>}
      <p className="text-xs text-text-secondary mt-4">
        Pagamenti sicuri con Stripe. Disdici quando vuoi dal portale clienti.
      </p>
    </div>
  );
}
