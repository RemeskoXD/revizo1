import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody } from '@/lib/json-body';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await readJsonBody<{ status: string }>(req);
    const newStatus = body.status;

    if (!['PAID', 'CANCELLED', 'UNPAID'].includes(newStatus)) {
      return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        technicianId: session.user.id
      }
    });

    if (!order) {
      return NextResponse.json({ message: 'Invoice not found' }, { status: 404 });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { invoiceStatus: newStatus }
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Error updating invoice status' }, { status: 500 });
  }
}
