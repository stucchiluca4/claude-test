import Stripe from 'stripe';

/** Client Stripe lato server (usa la chiave segreta, mai esposta al browser). */
export function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20',
  });
}
