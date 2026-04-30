import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'COMPANY_ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { technicianId } = await req.json();

    if (!technicianId) {
      return NextResponse.json({ message: 'Technician ID is required' }, { status: 400 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: { readableId: id },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Order does not belong to your company' }, { status: 403 });
    }

    // Verify technician belongs to company
    const tech = await prisma.user.findUnique({
      where: { id: technicianId },
    });

    if (!tech || tech.companyId !== session.user.id || tech.role !== 'TECHNICIAN') {
      return NextResponse.json({ message: 'Invalid technician' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { technicianId },
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Assign order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
