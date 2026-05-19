import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getLicenseStatus } from '@/lib/access-control';

export const dynamic = 'force-dynamic';

/**
 * Vrací stav předplatného přihlášeného uživatele pro UI banner.
 * Viz lib/access-control.ts.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, licenseValidUntil: true, requiresSubscriptionCheckout: true },
  });
  if (!user) {
    return NextResponse.json({ message: 'Uživatel nenalezen' }, { status: 404 });
  }

  const status = getLicenseStatus({
    role: user.role,
    licenseValidUntil: user.licenseValidUntil,
    requiresSubscriptionCheckout: user.requiresSubscriptionCheckout,
  });

  return NextResponse.json({
    state: status.state,
    active: status.active,
    daysLeft: status.daysLeft,
    validUntil: status.validUntil ? status.validUntil.toISOString() : null,
    message: status.message,
    requiresSubscriptionCheckout: Boolean(user.requiresSubscriptionCheckout),
  });
}
