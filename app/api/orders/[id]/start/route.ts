import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';
import { assertRevisionAuthValid } from '@/lib/revision-auth';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const authDenied = await assertRevisionAuthValid(session.user.id);
    if (authDenied) return authDenied;

    const { id } = await params;
    
    // Find the order
    const order = await prisma.order.findUnique({
      where: { readableId: id },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ message: 'Order is not pending' }, { status: 400 });
    }

    if (order.technicianId !== session.user.id && order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Order is not assigned to you' }, { status: 403 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'IN_PROGRESS' },
    });

    sendOrderStatusEmail(order.id, 'IN_PROGRESS').catch(console.error);

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Start order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
