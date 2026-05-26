import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { getObjectLimitStatus } from '@/lib/object-limits';
import { getObjectAddons } from '@/lib/pricing-db';
import { getLicenseStatus } from '@/lib/access-control';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`prop-create:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho nových nemovitostí. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{
      name?: string;
      address?: string;
      description?: string | null;
    }>(req, 48_384);

    const name = body.name != null ? String(body.name).trim().slice(0, 200) : '';
    const address = body.address != null ? String(body.address).trim().slice(0, 500) : '';
    const description =
      body.description != null ? String(body.description).trim().slice(0, 8000) : undefined;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const owner = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        role: true,
        objectLimitBase: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
        objectLimitOverride: true,
        licenseValidUntil: true,
        requiresSubscriptionCheckout: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // License check
    const licenseStatus = getLicenseStatus({
      role: owner.role,
      licenseValidUntil: owner.licenseValidUntil,
      requiresSubscriptionCheckout: owner.requiresSubscriptionCheckout,
    });
    if (!licenseStatus.active) {
      return NextResponse.json(
        {
          message: licenseStatus.message,
          code: 'LICENSE_REQUIRED',
          state: licenseStatus.state,
          checkoutPath: '/dashboard/settings?tab=billing',
        },
        { status: 402 },
      );
    }

    const [currentCount, addons] = await Promise.all([
      prisma.property.count({
        where: { ownerId: session.user.id },
      }),
      getObjectAddons(),
    ]);

    const status = getObjectLimitStatus(owner, currentCount, {
      extraPrice: addons.customerExtraObject.yearlyPriceCzk,
      packagePrice: addons.package10Objects.yearlyPriceCzk,
      packageLimit: addons.package10Objects.packageLimit,
    });

    if (!status.canAddMore) {
      return NextResponse.json(
        {
          message: status.message,
          code: 'OBJECT_LIMIT_REACHED',
          limit: status.limit,
          used: status.used,
          upgradeHint: status.upgradeHint,
        },
        { status: 402 },
      );
    }

    const property = await prisma.property.create({
      data: {
        name,
        address: address || undefined,
        description,
        ownerId: session.user.id,
      },
      include: {
        orders: true,
        claimedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Error creating property:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
