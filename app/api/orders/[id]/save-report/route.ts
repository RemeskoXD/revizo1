import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { reportFile, revisionResult, revisionNotes, nextRevisionDate } = await readJsonBody<any>(req, 10_000_000);

    const order = await prisma.order.findUnique({ where: { readableId: id } });
    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    if (order.technicianId !== session.user.id && order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Nemáte oprávnění k této objednávce' }, { status: 403 });
    }

    if (order.status === 'COMPLETED') {
      return NextResponse.json({ message: 'Nelze upravit zprávu u již dokončené zakázky.' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id, status: { not: 'COMPLETED' } },
      data: {
        reportFile,
        revisionResult: revisionResult || 'PASS',
        revisionNotes: revisionNotes || null,
        nextRevisionDate: nextRevisionDate ? new Date(nextRevisionDate) : undefined,
      }
    });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Revizní zpráva je příliš velká' }, { status: 413 });
    }
    console.error('Save report draft error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
