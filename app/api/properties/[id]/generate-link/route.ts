import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

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

    const token = crypto.randomBytes(32).toString('hex');

    const updated = await prisma.property.update({
      where: { id: propertyId },
      data: {
        transferToken: token,
        transferStatus: 'PENDING',
        claimedById: null
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error generating link:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
