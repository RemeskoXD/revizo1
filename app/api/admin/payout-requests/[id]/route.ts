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
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { status, amountPaid } = await req.json();

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
      where: { id },
      data
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Payout request update error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
