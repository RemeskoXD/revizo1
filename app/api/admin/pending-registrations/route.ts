import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Seznam účtů čekajících na schválení (technik / firma). */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: {
        accountStatus: 'PENDING_APPROVAL',
        role: { in: ['TECHNICIAN', 'COMPANY_ADMIN'] },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        ico: true,
        expectedTechnicians: true,
        pendingCompanyInviteCode: true,
        licenseMimeType: true,
        createdAt: true,
      },
    });

    return NextResponse.json(users);
  } catch (e) {
    console.error('pending-registrations GET', e);
    return NextResponse.json({ message: 'Chyba' }, { status: 500 });
  }
}
