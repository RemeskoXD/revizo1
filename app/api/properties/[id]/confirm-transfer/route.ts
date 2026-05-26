import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getObjectLimitStatus } from '@/lib/object-limits';
import { REALTY_TRANSFER_FEE_CZK } from '@/lib/subscription-pricing';
import { getObjectAddons } from '@/lib/pricing-db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'REALTY') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: propertyId } = await params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId }
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Property not found or unauthorized' }, { status: 404 });
    }

    if (property.transferStatus !== 'CLAIMED' || !property.claimedById) {
      return NextResponse.json({ message: 'Property is not claimed yet' }, { status: 400 });
    }

    const newOwner = await prisma.user.findUnique({
      where: { id: property.claimedById },
      select: {
        role: true,
        objectLimitBase: true,
        objectLimitExtraPaid: true,
        objectPackagePaid: true,
        objectLimitOverride: true,
      },
    });

    if (newOwner) {
      const [newOwnerCount, addons] = await Promise.all([
        prisma.property.count({
          where: { ownerId: property.claimedById },
        }),
        getObjectAddons(),
      ]);
      const status = getObjectLimitStatus(newOwner, newOwnerCount, {
        extraPrice: addons.customerExtraObject.yearlyPriceCzk,
        packagePrice: addons.package10Objects.yearlyPriceCzk,
        packageLimit: addons.package10Objects.packageLimit,
      });
      if (!status.canAddMore) {
        return NextResponse.json(
          {
            message: `Nový vlastník má vyčerpaný limit objektů (${status.used}/${status.limit}). ${status.message}`,
            code: 'OBJECT_LIMIT_REACHED_RECEIVER',
            limit: status.limit,
            used: status.used,
            upgradeHint: status.upgradeHint,
          },
          { status: 402 },
        );
      }
    }

    // Transfer ownership
    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        ownerId: property.claimedById,
        transferToken: null,
        transferStatus: null,
        claimedById: null
      }
    });

    // Also update all orders to belong to the new owner
    await prisma.order.updateMany({
      where: { propertyId: propertyId },
      data: { customerId: property.claimedById }
    });

    // Log the transfer
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'PROPERTY_TRANSFERRED',
        details: JSON.stringify({
          propertyId: property.id,
          propertyName: property.name,
          newOwnerId: property.claimedById
        }),
        targetId: property.id
      }
    });

    // Vytvořit RealtorTransferFee (200 Kč) – idempotentně.
    // Viz docs/business-decisions.md sekce 2.4.
    if (property.claimedById) {
      try {
        await prisma.realtorTransferFee.create({
          data: {
            realtorId: session.user.id,
            customerId: property.claimedById,
            propertyId: property.id,
            amountCzk: REALTY_TRANSFER_FEE_CZK,
            status: 'PENDING',
          },
        });
      } catch (e: any) {
        if (e?.code !== 'P2002') {
          console.error('Failed to create transfer fee:', e);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error confirming transfer:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
