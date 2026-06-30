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
    const { creditBalance, authorizedCategories } = await req.json();

    if (typeof creditBalance !== 'number') {
      return NextResponse.json({ message: 'Invalid credit balance' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        creditBalance,
        authorizedCategories: {
          set: (authorizedCategories || []).map((catId: string) => ({ id: catId }))
        }
      },
      include: {
        authorizedCategories: { select: { id: true, name: true } }
      }
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_TECHNICIAN_DETAILS',
        details: `Upraven kredit (${creditBalance}) a oprávnění pro technika ${updatedUser.email}`,
        targetId: id
      }
    });

    return NextResponse.json({ 
      creditBalance: updatedUser.creditBalance,
      authorizedCategories: updatedUser.authorizedCategories
    }, { status: 200 });
  } catch (error) {
    console.error('Update technician details error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
