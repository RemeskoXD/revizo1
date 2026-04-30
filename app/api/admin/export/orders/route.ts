import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (from) where.createdAt = { ...where.createdAt, gte: new Date(from) };
    if (to) where.createdAt = { ...where.createdAt, lte: new Date(to) };

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: { select: { name: true, email: true } },
        technician: { select: { name: true, email: true } },
        company: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'ID;Typ služby;Adresa;Zákazník;Email zákazníka;Technik;Firma;Stav;Cena;Výsledek;Vytvořeno;Dokončeno\n';
    const rows = orders.map(o => [
      o.readableId,
      o.serviceType,
      `"${o.address.replace(/"/g, '""')}"`,
      o.customer.name || '',
      o.customer.email || '',
      o.technician?.name || '',
      o.company?.name || '',
      o.status,
      o.price?.toString() || '0',
      o.revisionResult || '',
      o.createdAt.toISOString(),
      o.completedAt?.toISOString() || '',
    ].join(';')).join('\n');

    const csv = '\uFEFF' + header + rows;

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="revizone-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export orders error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
