import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error confirming transfer:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
