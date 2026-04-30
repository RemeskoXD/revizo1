import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe } from '@/lib/stripe-client';
import {
  getAppBaseUrl,
  isFakePaymentGatewayEnabled,
  isStripePaymentsConfigured,
  resolveStripeSettingsReturnPath,
} from '@/lib/stripe-config';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Vytvoří Stripe Checkout (předplatné). V Dashboardu Stripe musí být Price typu recurring (např. měsíční).
 * Po úspěšné platbě webhook invoice.paid prodlouží licenseValidUntil.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
    }

    let returnPath = '/dashboard/settings';
    try {
      const body = (await request.json().catch(() => ({}))) as { returnPath?: unknown };
      returnPath = resolveStripeSettingsReturnPath(body.returnPath);
    } catch {
      /* prázdné tělo */
    }

    const base = getAppBaseUrl();

    if (isFakePaymentGatewayEnabled()) {
      const url = `${base}/platba-test?rp=${encodeURIComponent(returnPath)}&m=checkout`;
      return NextResponse.json({ url, fake: true as const });
    }

    if (!isStripePaymentsConfigured()) {
      return NextResponse.json(
        { message: 'Platby Stripe nejsou nakonfigurovány (STRIPE_SECRET_KEY, STRIPE_PRICE_ID).' },
        { status: 503 }
      );
    }

    const rl = rateLimit(`stripe-checkout:${session.user.id}`, 15, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const priceId = process.env.STRIPE_PRICE_ID!.trim();
    const userId = session.user.id;
    const email = session.user.email?.trim() || undefined;

    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}${returnPath}?stripe=success&tab=billing`,
      cancel_url: `${base}${returnPath}?stripe=cancel&tab=billing`,
      client_reference_id: userId,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    if (!checkoutSession.url) {
      return NextResponse.json({ message: 'Nepodařilo se vytvořit platební relaci' }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error('Stripe checkout:', e);
    return NextResponse.json({ message: 'Chyba při vytváření platby' }, { status: 500 });
  }
}
