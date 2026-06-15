import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { isVerifiedAdmin: true }
    });

    // TODO: Actually handle the payout to the technician via Stripe Connect / Manual marking as payable.
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error verifying order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
