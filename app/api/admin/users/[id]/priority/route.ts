import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { priority } = await req.json();

    if (typeof priority !== 'number') {
      return NextResponse.json({ message: 'Invalid priority' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { priority },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_USER_PRIORITY',
        details: `Změněna priorita uživatele ${updatedUser.email} na ${priority}`,
        targetId: id
      }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Update priority error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
