import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { computeObjectLimit, getRoleBaseLimit } from '@/lib/object-limits';
import { getObjectAddons } from '@/lib/pricing-db';

/**
 * Admin endpoint pro čtení a nastavení limitů objektů na konkrétního uživatele.
 * Viz docs/pricing-rules.md a lib/object-limits.ts.
 *
 * Body:
 *   - objectLimitBase?: number | null   (null = vrátit na default dle role)
 *   - objectLimitExtraPaid?: number     (CUSTOMER – počet zaplacených dalších objektů)
 *   - objectPackagePaid?: boolean       (SVJ/COMPANY – aktivní balíček do 10)
 *   - objectLimitOverride?: number | null (individuální nabídka nad 10; null = zrušit override)
 */

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        objectLimitBase: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
        objectLimitOverride: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const [usedCount, addons] = await Promise.all([
      prisma.property.count({ where: { ownerId: id } }),
      getObjectAddons(),
    ]);
    const computed = computeObjectLimit(user, { packageLimit: addons.package10Objects.packageLimit });
    const roleBase = getRoleBaseLimit(user.role);

    return NextResponse.json({
      ...user,
      usedCount,
      computedLimit: Number.isFinite(computed) ? computed : null,
      roleBase: Number.isFinite(roleBase) ? roleBase : null,
    });
  } catch (error) {
    console.error('Get object limits error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = (await req.json()) as {
      objectLimitBase?: number | null;
      objectLimitExtraPaid?: number;
      objectPackagePaid?: boolean;
      objectLimitOverride?: number | null;
    };

    const data: Record<string, unknown> = {};

    if (body.objectLimitBase === null) {
      data.objectLimitBase = 0;
    } else if (typeof body.objectLimitBase === 'number' && Number.isFinite(body.objectLimitBase)) {
      data.objectLimitBase = Math.max(0, Math.floor(body.objectLimitBase));
    }

    if (typeof body.objectLimitExtraPaid === 'number' && Number.isFinite(body.objectLimitExtraPaid)) {
      data.objectLimitExtraPaid = Math.max(0, Math.floor(body.objectLimitExtraPaid));
    }

    if (typeof body.objectPackagePaid === 'boolean') {
      data.objectPackagePaid = body.objectPackagePaid;
    }

    if (body.objectLimitOverride === null) {
      data.objectLimitOverride = null;
    } else if (
      typeof body.objectLimitOverride === 'number' &&
      Number.isFinite(body.objectLimitOverride) &&
      body.objectLimitOverride > 0
    ) {
      data.objectLimitOverride = Math.floor(body.objectLimitOverride);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ message: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        role: true,
        objectLimitBase: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
        objectLimitOverride: true,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_USER_OBJECT_LIMITS',
        details: `Změněny limity objektů u ${updated.email}: ${JSON.stringify(data)}`,
        targetId: id,
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Update object limits error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
