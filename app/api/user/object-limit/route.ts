import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getObjectLimitStatus,
  getRoleBaseLimit,
  OBJECT_EXTRA_PRICE_CZK,
  OBJECT_PACKAGE_LIMIT,
  OBJECT_PACKAGE_PRICE_CZK,
} from '@/lib/object-limits';

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      role: true,
      objectLimitBase: true,
      objectLimitExtraPaid: true,
      objectPackagePaid: true,
      objectLimitOverride: true,
    },
  });

  if (!user) {
    return NextResponse.json({ message: 'Uživatel nenalezen' }, { status: 404 });
  }

  const count = await prisma.property.count({ where: { ownerId: session.user.id } });
  const status = getObjectLimitStatus(user, count);

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
      extraPricePerYearCzk: OBJECT_EXTRA_PRICE_CZK,
      packagePricePerYearCzk: OBJECT_PACKAGE_PRICE_CZK,
      packageLimit: OBJECT_PACKAGE_LIMIT,
    },
  });
}
