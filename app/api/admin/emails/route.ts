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
    const search = searchParams.get('q') || '';
    const type = searchParams.get('type') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { to: { contains: search } },
        { subject: { contains: search } },
        { orderId: { contains: search } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const [emails, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.emailLog.count({ where }),
    ]);

    return NextResponse.json({
      emails,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get email logs error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
