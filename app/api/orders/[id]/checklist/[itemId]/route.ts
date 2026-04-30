import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id, itemId } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      select: { id: true, technicianId: true },
    });
    if (!order || order.technicianId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await readJsonBody<{ isCompleted?: boolean }>(req, 4096);
    const isCompleted = Boolean(body.isCompleted);

    const existing = await prisma.checklistItem.findFirst({
      where: { id: itemId, orderId: order.id },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    const item = await prisma.checklistItem.update({
      where: { id: itemId },
      data: { isCompleted },
    });
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating checklist item' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id, itemId } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      select: { id: true, technicianId: true },
    });
    if (!order || order.technicianId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.checklistItem.findFirst({
      where: { id: itemId, orderId: order.id },
    });
    if (!existing) {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Error deleting checklist item' }, { status: 500 });
  }
}
