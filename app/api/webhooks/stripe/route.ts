import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe-client';
import { processStripeEvent } from '@/lib/stripe-process-event';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ message: 'STRIPE_WEBHOOK_SECRET není nastaven' }, { status: 503 });
  }

  const raw = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ message: 'Chybí Stripe-Signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature:', err);
    return NextResponse.json({ message: 'Neplatný podpis' }, { status: 400 });
  }

  const existing = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id } });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await processStripeEvent(event);
    await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
  } catch (e) {
    console.error('Stripe webhook processing:', e);
    return NextResponse.json({ message: 'Zpracování selhalo' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
