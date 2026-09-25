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
      const q = search.trim();
      const readableQ = q.startsWith('#') ? q.slice(1).trim() : q;
      const cleanDigits = q.replace(/\s+/g, '');
      const orList: any[] = [
        { readableId: { contains: readableQ } },
        { id: { contains: q } },
        { address: { contains: q } },
        { confirmedAddress: { contains: q } },
        { serviceType: { contains: q } },
        { propertyType: { contains: q } },
        { notes: { contains: q } },
        { customer: { name: { contains: q } } },
        { customer: { email: { contains: q } } },
        { customer: { phone: { contains: q } } },
        { customer: { address: { contains: q } } },
        { customer: { ico: { contains: q } } },
        { technician: { name: { contains: q } } },
        { technician: { email: { contains: q } } },
        { technician: { phone: { contains: q } } },
        { company: { name: { contains: q } } },
      ];

      if (cleanDigits.length >= 3 && cleanDigits !== q) {
        orList.push({ customer: { phone: { contains: cleanDigits } } });
        orList.push({ customer: { ico: { contains: cleanDigits } } });
        orList.push({ technician: { phone: { contains: cleanDigits } } });
      }

      conditions.push({ OR: orList });
    }

    if (statusFilter !== 'all') {
      conditions.push({ status: statusFilter });
    }
    if (typeFilter !== 'all') {
      conditions.push({ serviceType: typeFilter });
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
