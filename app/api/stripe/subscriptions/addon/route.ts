import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getStripe } from '@/lib/stripe-client';
import {
  isFakePaymentGatewayEnabled,
  isStripePaymentsConfigured,
} from '@/lib/stripe-config';
import { rateLimit } from '@/lib/rate-limit';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { ROLES } from '@/lib/constants';
import {
  objectAddonActivatedEmail,
  objectAddonRevokedEmail,
} from '@/lib/email-templates';
import { getObjectAddons } from '@/lib/pricing-db';
import { sendMail } from '@/lib/mail';
import {
  notifyAddonActivated,
  notifyAddonRevoked,
} from '@/lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type AddonKind = 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS';
type Action = 'SET_QUANTITY' | 'CANCEL';

/**
 * Úpravy / zrušení existujícího doplňkového předplatného (rozšíření objektů).
 *
 * Body:
 *   - kind: AddonKind
 *   - action: 'SET_QUANTITY' | 'CANCEL'
 *   - quantity?: number  (pro SET_QUANTITY u CUSTOMER_EXTRA_OBJECT; 0 = zruš)
 *
 * Pro `CUSTOMER_EXTRA_OBJECT`:
 *   - SET_QUANTITY  → najde Stripe subscription s `metadata.addonKind` a změní `items[0].quantity`
 *   - CANCEL        → cancel_at_period_end = true (k datu obnovy)
 *
 * Pro `PACKAGE_10_OBJECTS`:
 *   - CANCEL        → cancel_at_period_end = true
 *   - SET_QUANTITY  → nedává smysl (balíček je on/off), vrací 400
 *
 * Při FAKE_PAYMENT_GATEWAY=1 endpoint upraví přímo DB (bez Stripe).
 * V produkci ke konkrétní změně dojde až po Stripe webhook `customer.subscription.updated`,
 * ale tento endpoint vrací úspěch ihned po zaregistrování update v Stripe.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
    }

    let body: { kind?: unknown; action?: unknown; quantity?: unknown };
    try {
      body = await readJsonBody<{ kind?: unknown; action?: unknown; quantity?: unknown }>(
        request,
        2048,
      );
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
      }
      throw e;
    }

    const kind = typeof body.kind === 'string' ? (body.kind as AddonKind) : null;
    const action = typeof body.action === 'string' ? (body.action as Action) : null;

    if (!kind || (kind !== 'CUSTOMER_EXTRA_OBJECT' && kind !== 'PACKAGE_10_OBJECTS')) {
      return NextResponse.json({ message: 'Neznámý typ doplňku.' }, { status: 400 });
    }
    if (!action || (action !== 'SET_QUANTITY' && action !== 'CANCEL')) {
      return NextResponse.json({ message: 'Neznámá akce.' }, { status: 400 });
    }
    if (kind === 'PACKAGE_10_OBJECTS' && action === 'SET_QUANTITY') {
      return NextResponse.json(
        { message: 'Balíček nelze měnit kvantitativně, pouze aktivovat / zrušit.' },
        { status: 400 },
      );
    }

    const role = session.user.role;
    if (kind === 'CUSTOMER_EXTRA_OBJECT' && role !== ROLES.CUSTOMER) {
      return NextResponse.json({ message: 'Doplněk je jen pro zákazníky.' }, { status: 403 });
    }
    if (kind === 'PACKAGE_10_OBJECTS' && role !== ROLES.SVJ && role !== ROLES.COMPANY_ADMIN) {
      return NextResponse.json({ message: 'Doplněk je jen pro SVJ a firmy.' }, { status: 403 });
    }

    const rl = rateLimit(`stripe-addon-mut:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailNotifications: true,
        stripeCustomerId: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
      },
    });
    if (!user) {
      return NextResponse.json({ message: 'Uživatel nenalezen.' }, { status: 404 });
    }

    // Spočítej "kolik objektů musí zůstat povoleno" (aby přidaný počet nevyřadil
    // už zapsané objekty). Limit = base + extra (CUSTOMER) | balíček (SVJ/firma).
    // Tady řešíme jen CUSTOMER quantity – musí být >= max(0, count - 1).
    const usedCount = await prisma.property.count({ where: { ownerId: user.id } });

    // ----- FAKE GATEWAY -----
    if (isFakePaymentGatewayEnabled()) {
      if (kind === 'CUSTOMER_EXTRA_OBJECT' && action === 'SET_QUANTITY') {
        const q = Number(body.quantity);
        const newQ = Number.isFinite(q) && q >= 0 ? Math.floor(q) : 0;
        // Aby uživatel s 5 objekty nemohl spadnout pod limit (1 base + 4 extra).
        const minRequired = Math.max(0, usedCount - 1);
        if (newQ < minRequired) {
          return NextResponse.json(
            {
              message: `Nelze snížit pod ${minRequired} – nejprve smažte přebytečné objekty.`,
              code: 'OBJECT_LIMIT_REDUCE_BLOCKED',
            },
            { status: 409 },
          );
        }
        await prisma.user.update({
          where: { id: user.id },
          data: { objectLimitExtraPaid: newQ },
        });
        if (newQ === 0 && (user.objectLimitExtraPaid ?? 0) > 0) {
          notifyAddonRevoked({ userId: user.id, kind }).catch(console.error);
          if (user.email && user.emailNotifications) {
            const tpl = objectAddonRevokedEmail({ userName: user.name, kind });
            sendMail({ to: user.email, ...tpl }).catch(console.error);
          }
        } else if (newQ !== (user.objectLimitExtraPaid ?? 0)) {
          notifyAddonActivated({ userId: user.id, kind, quantity: newQ }).catch(console.error);
          if (user.email && user.emailNotifications) {
            const addons = await getObjectAddons();
            const tpl = objectAddonActivatedEmail({
              userName: user.name,
              kind,
              quantity: newQ,
              pricePerYearCzk: addons.customerExtraObject.yearlyPriceCzk,
            });
            sendMail({ to: user.email, ...tpl }).catch(console.error);
          }
        }
        return NextResponse.json({ ok: true, applied: { quantity: newQ } });
      }

      if (action === 'CANCEL') {
        const data =
          kind === 'PACKAGE_10_OBJECTS'
            ? { objectPackagePaid: false }
            : { objectLimitExtraPaid: 0 };
        await prisma.user.update({ where: { id: user.id }, data });
        notifyAddonRevoked({ userId: user.id, kind }).catch(console.error);
        if (user.email && user.emailNotifications) {
          const tpl = objectAddonRevokedEmail({ userName: user.name, kind });
          sendMail({ to: user.email, ...tpl }).catch(console.error);
        }
        return NextResponse.json({ ok: true, applied: { cancelled: true } });
      }
    }

    // ----- REAL STRIPE -----
    if (!isStripePaymentsConfigured()) {
      return NextResponse.json(
        { message: 'Platby Stripe nejsou nakonfigurovány.' },
        { status: 503 },
      );
    }
    if (!user.stripeCustomerId) {
      return NextResponse.json(
        { message: 'Nejdřív aktivujte doplněk – pak ho můžete spravovat.' },
        { status: 400 },
      );
    }

    const stripe = getStripe();

    // Najdi subscription s metadata.addonKind = kind pro tohoto customera.
    const subs = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: 'all',
      limit: 50,
      expand: ['data.items'],
    });
    const target = subs.data.find(
      (s) =>
        s.metadata?.addonKind === kind &&
        (s.status === 'active' || s.status === 'trialing' || s.status === 'past_due'),
    );
    if (!target) {
      return NextResponse.json(
        { message: 'Aktivní předplatné doplňku nebylo nalezeno.' },
        { status: 404 },
      );
    }

    if (action === 'CANCEL') {
      await stripe.subscriptions.update(target.id, { cancel_at_period_end: true });
      return NextResponse.json({ ok: true, applied: { cancelAtPeriodEnd: true } });
    }

    // SET_QUANTITY (jen CUSTOMER_EXTRA_OBJECT)
    const q = Number(body.quantity);
    const newQ = Number.isFinite(q) && q >= 0 ? Math.floor(q) : 0;
    const minRequired = Math.max(0, usedCount - 1);
    if (newQ < minRequired) {
      return NextResponse.json(
        {
          message: `Nelze snížit pod ${minRequired} – nejprve smažte přebytečné objekty.`,
          code: 'OBJECT_LIMIT_REDUCE_BLOCKED',
        },
        { status: 409 },
      );
    }

    if (newQ === 0) {
      await stripe.subscriptions.update(target.id, { cancel_at_period_end: true });
      return NextResponse.json({ ok: true, applied: { cancelAtPeriodEnd: true } });
    }

    const itemId = target.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json(
        { message: 'Předplatné nemá očekávané položky.' },
        { status: 500 },
      );
    }
    await stripe.subscriptions.update(target.id, {
      items: [{ id: itemId, quantity: newQ }],
      metadata: { ...target.metadata, addonQuantity: String(newQ) },
      proration_behavior: 'create_prorations',
    });

    return NextResponse.json({ ok: true, applied: { quantity: newQ } });
  } catch (e: any) {
    console.error('Addon subscription update error:', e);
    return NextResponse.json(
      { message: e?.message || 'Chyba při úpravě doplňku.' },
      { status: 500 },
    );
  }
}
