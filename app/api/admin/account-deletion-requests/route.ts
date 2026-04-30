import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ADMIN_ROLES = ['ADMIN', 'SUPPORT'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role || '')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const items = await prisma.accountDeletionRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(items);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Chyba serveru' }, { status: 500 });
  }
}
