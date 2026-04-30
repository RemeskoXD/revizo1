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
    const { role } = await req.json();

    if (!role) {
      return NextResponse.json({ message: 'Role is required' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_USER_ROLE',
        details: `Změněna role uživatele ${updatedUser.email} na ${role}`,
        targetId: id
      }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error('Update role error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
