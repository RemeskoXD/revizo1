import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

/** Stripe Customer Portal – správa karty a předplatného (vyžaduje uživatele s stripeCustomerId). */
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

    if (isFakePaymentGatewayEnabled()) {
      const base = getAppBaseUrl();
      const url = `${base}/platba-test?rp=${encodeURIComponent(returnPath)}&m=portal`;
      return NextResponse.json({ url, fake: true as const });
    }

    if (!isStripePaymentsConfigured()) {
      return NextResponse.json({ message: 'Stripe není nakonfigurován' }, { status: 503 });
    }

    const rl = rateLimit(`stripe-portal:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho požadavků.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { stripeCustomerId: true },
    });

    if (!user?.stripeCustomerId) {
      return NextResponse.json(
        { message: 'Nejdřív dokončete první platbu přes „Zaplatit předplatné“.' },
        { status: 400 }
      );
    }

    const stripe = getStripe();
    const portal = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${getAppBaseUrl()}${returnPath}?tab=billing`,
    });

    if (!portal.url) {
      return NextResponse.json({ message: 'Portal se nepodařilo vytvořit' }, { status: 500 });
    }

    return NextResponse.json({ url: portal.url });
  } catch (e) {
    console.error('Stripe portal:', e);
    return NextResponse.json({ message: 'Chyba portálu' }, { status: 500 });
  }
}
