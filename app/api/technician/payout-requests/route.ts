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

    const { amount, iban, notes, invoiceData } = await readJsonBody<any>(req, 10_000_000);

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Neplatná částka' }, { status: 400 });
    }

    const request = await prisma.payoutRequest.create({
      data: {
        technicianId: session.user.id,
        amount,
        iban,
        notes,
        invoiceUrl: invoiceData,
      },
    });

    return NextResponse.json(request);
  } catch (error: any) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: 'Soubor s fakturou je příliš velký' }, { status: 413 });
    }
    console.error('Payout request error:', error);
    return NextResponse.json({ error: 'Chyba při žádosti o výplatu' }, { status: 500 });
  }
}
