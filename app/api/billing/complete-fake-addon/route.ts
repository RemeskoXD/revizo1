import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { isFakePaymentGatewayEnabled } from '@/lib/stripe-config';
import { ROLES } from '@/lib/constants';
import { readJsonBody } from '@/lib/json-body';
import { sendMail } from '@/lib/mail';
import { objectAddonActivatedEmail } from '@/lib/email-templates';
import { OBJECT_EXTRA_PRICE_CZK, OBJECT_PACKAGE_PRICE_CZK } from '@/lib/object-limits';
import { notifyAddonActivated } from '@/lib/notifications';

/**
 * Falešné dokončení doplňkové platby (jen pro FAKE_PAYMENT_GATEWAY=1).
 * Webhook tuto cestu obchází – tento endpoint volá /platba-test po kliknutí na "Pokračovat".
 *
 * Body: { kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS', quantity?: number }
 */
export async function POST(req: Request) {
  if (!isFakePaymentGatewayEnabled()) {
    return NextResponse.json({ message: 'Není aktivní testovací platební režim.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{ kind?: unknown; quantity?: unknown }>(req, 1024).catch(
    () => ({} as { kind?: unknown; quantity?: unknown }),
  );

  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (kind !== 'CUSTOMER_EXTRA_OBJECT' && kind !== 'PACKAGE_10_OBJECTS') {
    return NextResponse.json({ message: 'Neznámý typ doplňku.' }, { status: 400 });
  }

  const role = session.user.role;
  if (kind === 'CUSTOMER_EXTRA_OBJECT' && role !== ROLES.CUSTOMER) {
    return NextResponse.json({ message: 'Tento doplněk je pouze pro zákazníky.' }, { status: 403 });
  }
  if (kind === 'PACKAGE_10_OBJECTS' && role !== ROLES.SVJ && role !== ROLES.COMPANY_ADMIN) {
    return NextResponse.json(
      { message: 'Tento doplněk je pouze pro SVJ a firmy.' },
      { status: 403 },
    );
  }

  const before = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailNotifications: true,
      objectPackagePaid: true,
      objectLimitExtraPaid: true,
    },
  });

  let appliedQuantity = 1;
  let stateChanged = false;

  if (kind === 'PACKAGE_10_OBJECTS') {
    if (before && !before.objectPackagePaid) stateChanged = true;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { objectPackagePaid: true },
    });
  } else {
    const q = Number(body.quantity);
    appliedQuantity = Number.isFinite(q) && q >= 1 ? Math.floor(q) : 1;
    if (before && (before.objectLimitExtraPaid ?? 0) !== appliedQuantity) stateChanged = true;
    await prisma.user.update({
      where: { id: session.user.id },
      data: { objectLimitExtraPaid: appliedQuantity },
    });
  }

  await prisma.activityLog.create({
    data: {
      userId: session.user.id,
      action: 'FAKE_ADDON_ACTIVATED',
      details: `kind=${kind} qty=${appliedQuantity}`,
      targetId: session.user.id,
    },
  });

  if (stateChanged) {
    if (before?.email && before.emailNotifications) {
      const tpl = objectAddonActivatedEmail({
        userName: before.name,
        kind,
        quantity: appliedQuantity,
        pricePerYearCzk:
          kind === 'PACKAGE_10_OBJECTS' ? OBJECT_PACKAGE_PRICE_CZK : OBJECT_EXTRA_PRICE_CZK,
      });
      sendMail({ to: before.email, ...tpl }).catch(console.error);
    }
    notifyAddonActivated({ userId: session.user.id, kind, quantity: appliedQuantity }).catch(console.error);
  }

  return NextResponse.json({ ok: true, kind });
}
