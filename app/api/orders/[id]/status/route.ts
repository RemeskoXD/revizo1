import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { status } = await req.json();

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { property: true }
    });

    if (!order || !order.property || order.property.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Order not found or unauthorized' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // Log the status change
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'ORDER_STATUS_CHANGED',
        details: JSON.stringify({
          orderId: order.id,
          readableId: order.readableId,
          oldStatus: order.status,
          newStatus: status
        }),
        targetId: order.id
      }
    });

    sendOrderStatusEmail(order.id, status).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
