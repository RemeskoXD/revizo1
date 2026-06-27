import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getObjectLimitStatus,
  getRoleBaseLimit,
} from '@/lib/object-limits';
import { getObjectAddons } from '@/lib/pricing-db';

export const dynamic = 'force-dynamic';

/**
 * Vrátí přihlášenému uživateli stav jeho limitu objektů.
 * Používají dashboardy (/dashboard, /svj, /company) pro zobrazení progress baru
 * a tlačítka „Aktivovat balíček / Přidat objekt“.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
  }

  const [user, addons] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        objectLimitBase: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
        objectLimitOverride: true,
      },
    }),
    getObjectAddons(),
  ]);

  if (!user) {
    return NextResponse.json({ message: 'Uživatel nenalezen' }, { status: 404 });
  }

  let count = 0;
  if (user.role === 'CUSTOMER') {
    const uniqueAddresses = await prisma.order.groupBy({
      by: ['address'],
      where: { customerId: session.user.id, isDeleted: false },
    });
    count = uniqueAddresses.length;
  } else {
    count = await prisma.property.count({ where: { ownerId: session.user.id } });
  }
  const status = getObjectLimitStatus(user, count, {
    extraPrice: addons.customerExtraObject.yearlyPriceCzk,
    packagePrice: addons.package10Objects.yearlyPriceCzk,
    packageLimit: addons.package10Objects.packageLimit,
  });

  return NextResponse.json({
    role: user.role,
    used: status.used,
    limit: Number.isFinite(status.limit) ? status.limit : null,
    remaining: Number.isFinite(status.remaining) ? status.remaining : null,
    canAddMore: status.canAddMore,
    message: status.message,
    upgradeHint: status.upgradeHint,
    flags: {
      objectPackagePaid: Boolean(user.objectPackagePaid),
      objectLimitExtraPaid: user.objectLimitExtraPaid ?? 0,
      hasOverride: typeof user.objectLimitOverride === 'number' && user.objectLimitOverride > 0,
    },
    rules: {
      roleBase: Number.isFinite(getRoleBaseLimit(user.role)) ? getRoleBaseLimit(user.role) : null,
      extraPricePerYearCzk: addons.customerExtraObject.yearlyPriceCzk,
      packagePricePerYearCzk: addons.package10Objects.yearlyPriceCzk,
      packageLimit: addons.package10Objects.packageLimit,
    },
  });
}
