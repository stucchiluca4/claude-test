import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';

/**
 * Webhook Stripe: Stripe chiama questo endpoint quando succede qualcosa
 * (pagamento riuscito, abbonamento disdetto…). Qui aggiorniamo il database.
 *
 * Sicurezza: verifichiamo la firma con STRIPE_WEBHOOK_SECRET, così solo
 * Stripe (e nessun altro) può chiamarci. Il DB è aggiornato con la chiave
 * service_role, che bypassa RLS: questa route è "il server", non un utente.
 */
/** Piano dedotto dall'ID prezzo Stripe: fonte di verità anche quando
 *  l'abbonamento viene cambiato dal Customer Portal (metadata assenti). */
function planFromPrice(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string> = {};
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_STARTER)
    map[process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_STARTER] = 'coach_starter';
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_PRO)
    map[process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_PRO] = 'coach_pro';
  if (process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_ELITE)
    map[process.env.NEXT_PUBLIC_STRIPE_PRICE_COACH_ELITE] = 'coach_elite';
  return map[priceId] ?? null;
}

export async function POST(request: Request) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Firma non valida' }, { status: 400 });
  }

  const db = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const profileId = sub.metadata?.profile_id;
      if (!profileId) break;

      const { error } = await db.from('subscriptions').upsert(
        {
          profile_id: profileId,
          stripe_customer_id: String(sub.customer),
          stripe_subscription_id: sub.id,
          plan_key:
            planFromPrice(sub.items?.data?.[0]?.price?.id) ??
            sub.metadata?.plan_key ??
            'coach_pro',
          status: (
            {
              trialing: 'trialing',
              active: 'active',
              past_due: 'past_due',
              canceled: 'canceled',
              incomplete: 'incomplete',
              incomplete_expired: 'canceled',
              unpaid: 'past_due',
              paused: 'canceled',
            } as const
          )[sub.status],
          trial_ends_at: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_subscription_id' }
      );
      // Errore DB → 500: Stripe ritenterà la consegna dell'evento
      if (error) {
        return NextResponse.json({ error: 'Errore DB' }, { status: 500 });
      }
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const { data: subRow } = await db
        .from('subscriptions')
        .select('id')
        .eq('stripe_subscription_id', String(invoice.subscription))
        .maybeSingle();

      const { error } = await db.from('payments').upsert(
        {
          subscription_id: subRow?.id ?? null,
          stripe_invoice_id: invoice.id,
          amount_cents: invoice.amount_paid,
          currency: invoice.currency,
          status: 'paid',
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_invoice_id' }
      );
      if (error) {
        return NextResponse.json({ error: 'Errore DB' }, { status: 500 });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
