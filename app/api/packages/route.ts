import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const role = searchParams.get('role') || session.user.role;

    // Filter based on user profile
    const packages = await prisma.servicePackage.findMany({
      where: {
        isActive: true,
        ...(role === 'CUSTOMER' ? { isVisibleRodinnyDum: true } : {}),
        ...(role === 'SVJ' ? { isVisibleSVJ: true } : {}),
      },
      orderBy: { orderIndex: 'asc' },
    });

    return NextResponse.json({ packages });
  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
