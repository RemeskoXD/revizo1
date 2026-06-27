import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.payoutRequest.findUnique({
      where: { id },
      include: { order: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (existing.technicianId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (body.action === 'mark_paid') {
      const [updatedPayout, updatedOrder] = await prisma.$transaction([
        prisma.payoutRequest.update({
          where: { id },
          data: { status: 'PAID', paidAt: new Date() }
        }),
        ...(existing.orderId ? [
          prisma.order.update({
            where: { id: existing.orderId },
            data: { isPaid: true }
          })
        ] : [])
      ]);

      return NextResponse.json({ success: true, payout: updatedPayout });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update payout request error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
