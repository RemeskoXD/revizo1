import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const banned = typeof body?.banned === 'boolean' ? body.banned : null;

    if (banned === null) {
      return NextResponse.json({ message: 'Missing banned (boolean)' }, { status: 400 });
    }

    if (id === session.user.id) {
      return NextResponse.json({ message: 'Cannot change ban on yourself' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { bannedAt: banned ? new Date() : null },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: banned ? 'BANNED_USER' : 'UNBANNED_USER',
        details: banned
          ? `Zablokován uživatel ${updatedUser.email}`
          : `Odblokován uživatel ${updatedUser.email}`,
        targetId: id,
      },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Ban user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
