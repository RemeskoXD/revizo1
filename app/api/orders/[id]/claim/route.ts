import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyOrderAssigned, sendOrderStatusEmail } from '@/lib/notifications';
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

    if (!order.isPublic || order.status !== 'PENDING') {
      return NextResponse.json({ message: 'Order is not available to claim' }, { status: 400 });
    }

    // Claim the order
    const updateData: any = {
      isPublic: false,
      assignedAt: new Date(),
    };

    if (session.user.role === 'TECHNICIAN') {
      updateData.technicianId = session.user.id;
      // If technician belongs to a company, also set companyId
      const tech = await prisma.user.findUnique({ where: { id: session.user.id } });
      if (tech?.companyId) {
        updateData.companyId = tech.companyId;
      }
    } else if (session.user.role === 'COMPANY_ADMIN') {
      updateData.companyId = session.user.id;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    await notifyOrderAssigned(order.id, order.readableId, order.customerId, session.user.name || 'Technik');
    sendOrderStatusEmail(order.id, 'PENDING').catch(console.error);

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Claim order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
