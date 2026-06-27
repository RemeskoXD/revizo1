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
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || 'all';
    const companyFilter = searchParams.get('company') || 'all';
    const typeFilter = searchParams.get('type') || 'all';
    
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const skip = (page - 1) * limit;

    const conditions: any[] = [];

    if (search) {
      conditions.push({
        OR: [
          { readableId: { contains: search, mode: 'insensitive' } },
          { orderAddress: { contains: search, mode: 'insensitive' } },
          { customer: { name: { contains: search, mode: 'insensitive' } } },
          { customer: { email: { contains: search, mode: 'insensitive' } } },
          { customer: { phone: { contains: search, mode: 'insensitive' } } },
        ]
      });
    }

    if (statusFilter !== 'all') {
      conditions.push({ status: statusFilter });
    }
    if (typeFilter !== 'all') {
      conditions.push({ type: typeFilter });
    }
    if (companyFilter !== 'all') {
      conditions.push({ companyId: companyFilter });
    }

    const where = conditions.length > 0 ? { AND: conditions } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          customer: true,
          technician: true,
          company: true,
        },
      }),
      prisma.order.count({ where })
    ]);

    return NextResponse.json({ orders, total, page, totalPages: Math.ceil(total / limit) }, { status: 200 });
  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
