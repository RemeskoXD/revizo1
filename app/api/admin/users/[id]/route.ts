import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ message: 'Cannot delete yourself' }, { status: 400 });
    }

    const deletedUser = await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'SOFT_DELETED_USER',
        details: `Deaktivován uživatel ${deletedUser.email}`,
        targetId: id
      }
    });

    return NextResponse.json({ message: 'User deactivated' }, { status: 200 });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
