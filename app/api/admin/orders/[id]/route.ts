import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const order = await prisma.order.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SOFT_DELETED_ORDER',
        details: `Přesunuta do koše objednávka ${order.readableId}`,
        targetId: id
      }
    });

    return NextResponse.json({ message: 'Order moved to trash' }, { status: 200 });
  } catch (error) {
    console.error('Delete order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { technicianId, companyId, status } = body;

    const dataToUpdate: any = {};
    if (technicianId !== undefined) dataToUpdate.technicianId = technicianId;
    if (companyId !== undefined) dataToUpdate.companyId = companyId;
    if (status !== undefined) dataToUpdate.status = status;

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_ORDER',
        details: `Upravena objednávka ${updatedOrder.readableId}`,
        targetId: id
      }
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
