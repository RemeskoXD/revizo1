import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const tasks = await prisma.defectTask.findMany({
      where: { userId: session.user.id },
      include: { order: { select: { readableId: true, serviceType: true, address: true } } },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Get defect tasks error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { taskId, status } = await req.json();
    if (!taskId || !status) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const task = await prisma.defectTask.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== session.user.id) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const updated = await prisma.defectTask.update({
      where: { id: taskId },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update defect task error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
