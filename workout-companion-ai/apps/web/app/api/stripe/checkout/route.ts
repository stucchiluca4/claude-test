import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

/**
 * Crea una sessione di Stripe Checkout per l'abbonamento scelto.
 * Il browser viene reindirizzato alla pagina di pagamento ospitata da Stripe.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Non autenticato' }, { status: 401 });
  }

  const { planKey, priceId } = await request.json();
  if (!priceId) {
    return NextResponse.json(
      { error: 'Prezzo non configurato: aggiungi gli ID prezzo Stripe nel file .env' },
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
