import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';

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
    const { 
      technicianId, 
      companyId, 
      status, 
      isVerifiedAdmin,
      price,
      address,
      notes,
      scheduledDate,
      isPaid
    } = body;

    const dataToUpdate: any = {};
    if (technicianId !== undefined) dataToUpdate.technicianId = technicianId || null;
    if (companyId !== undefined) dataToUpdate.companyId = companyId || null;
    if (status !== undefined) dataToUpdate.status = status;
    if (isVerifiedAdmin !== undefined) dataToUpdate.isVerifiedAdmin = Boolean(isVerifiedAdmin);
    if (price !== undefined) dataToUpdate.price = price === null || price === '' ? null : Number(price);
    if (address !== undefined) dataToUpdate.address = address;
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (scheduledDate !== undefined) dataToUpdate.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (isPaid !== undefined) dataToUpdate.isPaid = Boolean(isPaid);

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: dataToUpdate,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        technician: { select: { id: true, name: true, email: true, phone: true } },
        company: { select: { id: true, name: true, email: true } },
      }
    });

    if (status === 'CANCELLED') {
      sendOrderStatusEmail(updatedOrder.id, 'CANCELLED').catch(console.error);

      try {
        await prisma.supportTicket.updateMany({
          where: {
            category: 'ORDER_CANCELLATION',
            subject: { contains: updatedOrder.readableId },
            status: 'OPEN',
          },
          data: { status: 'RESOLVED' },
        });
      } catch {
        // ignore
      }
    }

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: status === 'CANCELLED' ? 'ADMIN_ORDER_CANCELLED' : 'UPDATED_ORDER',
        details: status === 'CANCELLED' ? `Administrátor stornoval objednávku ${updatedOrder.readableId}` : `Upravena objednávka ${updatedOrder.readableId}`,
        targetId: id
      }
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
