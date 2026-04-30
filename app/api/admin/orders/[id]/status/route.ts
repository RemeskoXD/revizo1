import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status } = await req.json();

    if (!status) {
      return NextResponse.json({ message: 'Status is required' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        customer: true,
        technician: true,
      }
    });

    sendOrderStatusEmail(id, status).catch(console.error);

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Update order status error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
