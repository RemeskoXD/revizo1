import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.revisionCategory.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { orders: true } },
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get revision categories error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
