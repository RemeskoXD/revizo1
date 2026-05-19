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
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import {
  REALTY_TRANSFER_FEE_CZK,
  STRIPE_PRICE_REALTY_TRANSFER_FEE,
} from '@/lib/subscription-pricing';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Makléř vytvoří Stripe Checkout pro úhradu transferního poplatku 200 Kč.
 * Po úspěšné platbě webhook (lib/stripe-process-event.ts) označí poplatek jako PAID.
 *
 * Body:
 *   - feeId: ID RealtorTransferFee
 *   - returnPath?: cesta pro návrat
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
    }
    if (session.user.role !== ROLES.REALTY && session.user.role !== ROLES.PRODUCT_MANAGER) {
      return NextResponse.json({ message: 'Doplněk je jen pro makléře' }, { status: 403 });
    }

    let body: { feeId?: unknown; returnPath?: unknown };
    try {
      body = await readJsonBody<{ feeId?: unknown; returnPath?: unknown }>(req, 2048);
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return NextResponse.json({ message: 'Příliš velký požadavek' }, { status: 413 });
      }
      throw e;
    }

    const feeId = typeof body.feeId === 'string' ? body.feeId : '';
    if (!feeId) {
      return NextResponse.json({ message: 'feeId je povinné' }, { status: 400 });
    }

    const fee = await prisma.realtorTransferFee.findUnique({
      where: { id: feeId },
      include: { property: { select: { name: true } } },
    });
    if (!fee || fee.realtorId !== session.user.id) {
      return NextResponse.json({ message: 'Poplatek nenalezen' }, { status: 404 });
    }
    if (fee.status === 'PAID') {
      return NextResponse.json({ message: 'Poplatek je již uhrazen' }, { status: 400 });
    }

    const returnPath = resolveStripeSettingsReturnPath(body.returnPath);
    const base = getAppBaseUrl();

    if (isFakePaymentGatewayEnabled()) {
      const params = new URLSearchParams({
        rp: returnPath,
        m: 'checkout',
        purpose: 'transfer-fee',
        feeId: fee.id,
      });
      return NextResponse.json({ url: `${base}/platba-test?${params.toString()}`, fake: true });
    }

    if (!isStripePaymentsConfigured()) {
      return NextResponse.json(
        { message: 'Stripe není nakonfigurován' },
        { status: 503 },
      );
    }

    if (!STRIPE_PRICE_REALTY_TRANSFER_FEE) {
      return NextResponse.json(
        { message: 'STRIPE_PRICE_REALTY_TRANSFER_FEE není nastaveno v .env' },
        { status: 500 },
      );
    }

    const rl = rateLimit(`transfer-fee:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const stripe = getStripe();
    const checkout = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: STRIPE_PRICE_REALTY_TRANSFER_FEE, quantity: 1 }],
      success_url: `${base}${returnPath}?stripe=success&transferFee=${fee.id}`,
      cancel_url: `${base}${returnPath}?stripe=cancel&transferFee=${fee.id}`,
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        transferFeeId: fee.id,
        propertyId: fee.propertyId,
        purpose: 'REALTY_TRANSFER_FEE',
      },
      customer_email: session.user.email || undefined,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    });

    if (!checkout.url) {
      return NextResponse.json({ message: 'Nepodařilo se vytvořit platební relaci' }, { status: 500 });
    }
    return NextResponse.json({ url: checkout.url, feeId: fee.id, amountCzk: REALTY_TRANSFER_FEE_CZK });
  } catch (e: any) {
    console.error('Realty transfer fee checkout error:', e);
    return NextResponse.json(
      { message: e?.message || 'Chyba při vytváření platby' },
      { status: 500 },
    );
  }
}
