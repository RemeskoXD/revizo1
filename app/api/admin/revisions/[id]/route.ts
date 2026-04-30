import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { intervalMonths, description, legalBasis } = body;

    if (intervalMonths !== undefined && (typeof intervalMonths !== 'number' || intervalMonths < 1)) {
      return NextResponse.json({ message: 'Interval musí být alespoň 1 měsíc' }, { status: 400 });
    }

    const updated = await prisma.revisionCategory.update({
      where: { id },
      data: {
        ...(intervalMonths !== undefined && { intervalMonths }),
        ...(description !== undefined && { description }),
        ...(legalBasis !== undefined && { legalBasis }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update revision category error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.order.updateMany({
      where: { revisionCategoryId: id },
      data: { revisionCategoryId: null },
    });

    await prisma.revisionCategory.delete({ where: { id } });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    console.error('Delete revision category error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
