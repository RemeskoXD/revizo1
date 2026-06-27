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

  try {
    await prisma.stripeWebhookEvent.create({ data: { id: event.id } });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('Stripe webhook db lock error:', e);
    return NextResponse.json({ message: 'Database lock failed' }, { status: 500 });
  }

  try {
    await processStripeEvent(event);
  } catch (e) {
    // Pokud selže zpracování, musíme event smazat, aby to Stripe mohl zkusit znovu
    await prisma.stripeWebhookEvent.delete({ where: { id: event.id } }).catch(console.error);
    console.error('Stripe webhook processing:', e);
    return NextResponse.json({ message: 'Zpracování selhalo' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
