import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyScheduleSet, sendOrderStatusEmail } from '@/lib/notifications';
import { assertRevisionAuthValid } from '@/lib/revision-auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'TECHNICIAN' || session.user.role === 'COMPANY_ADMIN') {
      const authDenied = await assertRevisionAuthValid(session.user.id);
      if (authDenied) return authDenied;
    }

    const { id } = await params;
    const body = await req.json();
    const { scheduledDate, scheduledNote, confirmedAddress, nextRevisionDate } = body;

    const order = await prisma.order.findUnique({ where: { readableId: id } });
    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    if (order.technicianId !== session.user.id && order.companyId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Nemáte oprávnění' }, { status: 403 });
    }

    const updateData: any = {};

    if (scheduledDate !== undefined) {
      updateData.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    }
    if (scheduledNote !== undefined) {
      updateData.scheduledNote = scheduledNote || null;
    }
    if (confirmedAddress !== undefined) {
      updateData.confirmedAddress = confirmedAddress || null;
    }
    if (nextRevisionDate !== undefined) {
      updateData.nextRevisionDate = nextRevisionDate ? new Date(nextRevisionDate) : null;
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    if (scheduledDate && order.customerId) {
      const dateStr = new Date(scheduledDate).toLocaleString('cs-CZ');
      await notifyScheduleSet(order.readableId, order.customerId, dateStr);
      sendOrderStatusEmail(order.id, updated.status).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Schedule order error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
