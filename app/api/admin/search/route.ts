import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ orders: [], users: [] });
    }

    const cleanQuery = query.startsWith('#') ? query.slice(1).trim() : query;

    const [orders, users] = await Promise.all([
      prisma.order.findMany({
        where: {
          isDeleted: false,
          OR: [
            { readableId: { contains: cleanQuery } },
            { address: { contains: query } },
            { serviceType: { contains: query } },
            { customer: { name: { contains: query } } },
            { customer: { email: { contains: query } } },
            { technician: { name: { contains: query } } },
          ],
        },
        include: {
          customer: { select: { id: true, name: true, email: true, phone: true } },
          technician: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.user.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: query } },
            { email: { contains: query } },
            { phone: { contains: query } },
            { ico: { contains: query } },
            { address: { contains: query } },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          address: true,
          ico: true,
          bannedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
    ]);

    return NextResponse.json({ orders, users });
  } catch (error) {
    console.error('Admin search error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
