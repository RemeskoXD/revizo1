import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, iban, notes, invoiceData, orderId, dueDate } = await readJsonBody<any>(req, 10_000_000);

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Neplatná částka' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'Neplatný uživatel' }, { status: 400 });
    }

    const transactionResult = await prisma.$transaction(async (tx) => {
      // Zámek uživatele proti race condition (zabrání souběžnému vytvoření více žádostí)
      await tx.$executeRaw`SELECT id FROM User WHERE id = ${session.user.id} FOR UPDATE`;

      if (orderId) {
        const existing = await tx.payoutRequest.findFirst({
          where: { orderId }
        });
        if (existing) {
          throw new Error('Pro tuto zakázku již existuje žádost o výplatu / faktura.');
        }
      }

      const request = await tx.payoutRequest.create({
        data: {
          technicianId: session.user.id,
          amount,
          iban,
          notes,
          invoiceUrl: invoiceData,
          orderId,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      if (orderId && invoiceData) {
        await tx.order.update({
          where: { id: orderId },
          data: { 
            invoiceFile: invoiceData,
            invoiceDueDate: dueDate ? new Date(dueDate) : null,
            price: amount
          }
        });
      }

      return request;
    });

    return NextResponse.json(transactionResult);
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return NextResponse.json({ error: 'Nedostatečný zůstatek nebo neplatný uživatel' }, { status: 400 });
    }
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: 'Soubor s fakturou je příliš velký' }, { status: 413 });
    }
    if (error instanceof Error && error.message === 'Pro tuto zakázku již existuje žádost o výplatu / faktura.') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Payout request error:', error);
    return NextResponse.json({ error: 'Chyba při žádosti o výplatu' }, { status: 500 });
  }
}
