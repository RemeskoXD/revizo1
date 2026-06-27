import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { status, amountPaid } = await req.json();

    const existing = await prisma.payoutRequest.findUnique({ 
      where: { id },
      include: { technician: true }
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (session.user.role === 'COMPANY_ADMIN' && existing.technician.companyId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data: any = { status };
    if (status === 'PAID') {
      data.paidAt = new Date();
      if (amountPaid !== undefined) {
        data.amountPaid = Number(amountPaid);
      }
    } else if (status === 'PENDING') {
      data.paidAt = null;
      data.amountPaid = null;
    }

    const updated = await prisma.payoutRequest.update({
      where: { id, status: existing.status },
      data
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Uživatel nemá dostatek kreditu nebo se stav změnil' }, { status: 400 });
    }
    console.error('Payout request update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
