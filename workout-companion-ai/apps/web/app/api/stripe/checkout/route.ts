import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

/**
 * Crea una sessione di Stripe Checkout per l'abbonamento scelto.
 * Il browser viene reindirizzato alla pagina di pagamento ospitata da Stripe.
 *
 * Sicurezza: il prezzo è deciso QUI dalla mappa piano → variabile d'ambiente.
 * Il priceId eventualmente inviato dal browser viene ignorato, così nessuno
 * può abbonarsi a un piano usando il prezzo di un altro.
 */
const PRICE_BY_PLAN: Record<string, string | undefined> = {
  coach_starter: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_STARTER,
  coach_pro: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_PRO,
  coach_elite: process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_ELITE,
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  let planKey: string;
  try {
    ({ planKey } = await request.json());
  } catch {
    return NextResponse.json({ error: 'Richiesta non valida' }, { status: 400 });
  }

  const priceId = PRICE_BY_PLAN[planKey];
  if (!priceId) {
    return NextResponse.json(
      { error: 'Piano non valido o prezzo non configurato: aggiungi gli ID prezzo Stripe nel file .env' },
      { status: 400 }
    );
  }

  // Già abbonato? Niente secondo checkout (doppia fatturazione, trial ripetuti):
  // la gestione passa dal Customer Portal.
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('profile_id', user.id)
    .in('status', ['trialing', 'active'])
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'Hai già un abbonamento attivo: usa "Gestisci abbonamento".' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined,
    subscription_data: {
      trial_period_days: 14,
      metadata: { profile_id: user.id, plan_key: planKey },
    },
    metadata: { profile_id: user.id, plan_key: planKey },
    success_url: `${appUrl}/abbonamento?success=1`,
    cancel_url: `${appUrl}/abbonamento?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
