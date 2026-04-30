import Stripe from 'stripe';

let instance: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  if (!instance) {
    instance = new Stripe(key, { typescript: true });
  }
  return instance;
}
