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
import { OBJECT_ADDONS, COMPANY_TECH_SEAT_STRIPE_PRICE_ID } from '@/lib/subscription-pricing';
import { ROLES } from '@/lib/constants';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { computeBillableTechs } from '@/lib/company-pricing';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AddonKind = 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS' | 'COMPANY_TECH_SEATS';

const ALLOWED_KINDS: ReadonlySet<AddonKind> = new Set<AddonKind>([
  'CUSTOMER_EXTRA_OBJECT',
  'PACKAGE_10_OBJECTS',
  'COMPANY_TECH_SEATS',
]);

/**
 * Vytvoří Stripe Checkout pro **doplněk** (rozšíření počtu objektů).
 * Viz docs/pricing-rules.md a lib/object-limits.ts.
 *
 * Body:
 *   - kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS'
 *   - quantity?: number  (jen u CUSTOMER_EXTRA_OBJECT – počet dalších objektů, výchozí 1)
 *   - returnPath?: string
 *
 * Po úspěšné platbě webhook (lib/stripe-process-event.ts) přepne:
 *   - PACKAGE_10_OBJECTS  → User.objectPackagePaid = true
 *   - CUSTOMER_EXTRA_OBJECT → User.objectLimitExtraPaid = quantity
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
    }

    let body: { kind?: unknown; quantity?: unknown; returnPath?: unknown };
    try {
      body = await readJsonBody<{ kind?: unknown; quantity?: unknown; returnPath?: unknown }>(
        request,
        4096,
      );
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
      }
      throw e;
    }

    const kind = typeof body.kind === 'string' ? (body.kind as AddonKind) : null;
    if (!kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ message: 'Neznámý typ doplňku' }, { status: 400 });
    }

    const role = session.user.role;

    if (kind === 'CUSTOMER_EXTRA_OBJECT' && role !== ROLES.CUSTOMER) {
      return NextResponse.json(
        { message: 'Tento doplněk je pouze pro zákazníky.' },
        { status: 403 },
      );
    }
    if (
      kind === 'PACKAGE_10_OBJECTS' &&
      role !== ROLES.SVJ &&
      role !== ROLES.COMPANY_ADMIN
    ) {
      return NextResponse.json(
        { message: 'Tento doplněk je pouze pro SVJ a firmy.' },
        { status: 403 },
      );
    }
    if (kind === 'COMPANY_TECH_SEATS' && role !== ROLES.COMPANY_ADMIN) {
      return NextResponse.json(
        { message: 'Tento doplněk je pouze pro firmy.' },
        { status: 403 },
      );
    }

    let quantity = 1;
    if (kind === 'CUSTOMER_EXTRA_OBJECT') {
      const q = Number(body.quantity);
      if (Number.isFinite(q) && q >= 1 && q <= 100) {
        quantity = Math.floor(q);
      }
    } else if (kind === 'COMPANY_TECH_SEATS') {
      // Quantity = aktuální billable techs.
      const techCount = await prisma.user.count({
        where: { companyId: session.user.id, role: ROLES.TECHNICIAN, isDeleted: false },
      });
      quantity = Math.max(1, computeBillableTechs(techCount));
    }

    const returnPath = resolveStripeSettingsReturnPath(body.returnPath);
    const base = getAppBaseUrl();

    if (isFakePaymentGatewayEnabled()) {
      const params = new URLSearchParams({
        rp: returnPath,
        m: 'checkout',
        purpose: 'addon',
        addon: kind,
      });
      if (kind === 'CUSTOMER_EXTRA_OBJECT') params.set('qty', String(quantity));
      return NextResponse.json({ url: `${base}/platba-test?${params.toString()}`, fake: true });
    }

    if (!isStripePaymentsConfigured()) {
      return NextResponse.json(
        { message: 'Platby Stripe nejsou nakonfigurovány (STRIPE_SECRET_KEY).' },
        { status: 503 },
      );
    }

    const priceId =
      kind === 'COMPANY_TECH_SEATS'
        ? COMPANY_TECH_SEAT_STRIPE_PRICE_ID
        : OBJECT_ADDONS[kind as 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS'].stripePriceId;
    if (!priceId) {
      return NextResponse.json(
        { message: `Pro doplněk ${kind} není nastavena Stripe Price ID (.env).` },
        { status: 500 },
      );
    }

    const rl = rateLimit(`stripe-addon:${session.user.id}`, 15, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const userId = session.user.id;
    const email = session.user.email?.trim() || undefined;

    const stripe = getStripe();
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: `${base}${returnPath}?stripe=success&tab=billing&addon=${kind}`,
      cancel_url: `${base}${returnPath}?stripe=cancel&tab=billing&addon=${kind}`,
      client_reference_id: userId,
      metadata: {
        userId,
        addonKind: kind,
        addonQuantity: String(quantity),
      },
      subscription_data: {
        metadata: {
          userId,
          addonKind: kind,
          addonQuantity: String(quantity),
        },
      },
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { message: 'Nepodařilo se vytvořit platební relaci' },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e: any) {
    console.error('Stripe addon checkout error:', e);
    return NextResponse.json(
      { message: e?.message || 'Chyba při vytváření platby' },
      { status: 500 },
    );
  }
}
