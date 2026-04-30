import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      select: { id: true, customerId: true, technicianId: true, companyId: true },
    });
    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }
    const uid = session.user.id;
    const role = session.user.role;
    const canView =
      role === 'ADMIN' ||
      order.customerId === uid ||
      order.technicianId === uid ||
      order.companyId === uid ||
      (role === 'COMPANY_ADMIN' && order.companyId === uid);
    if (!canView) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const items = await prisma.checklistItem.findMany({
      where: { orderId: order.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ message: 'Error fetching checklist' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
      select: { id: true, technicianId: true },
    });
    if (!order || order.technicianId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const rl = rateLimit(`chk-add:${session.user.id}:${order.id}`, 80, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho položek' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ text?: string }>(req, 16_384);
    const text = body.text != null ? String(body.text).trim().slice(0, 2000) : '';

    if (!text) {
      return NextResponse.json({ message: 'Text is required' }, { status: 400 });
    }

    const item = await prisma.checklistItem.create({
      data: {
        orderId: order.id,
        text,
      },
    });
    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating checklist item' }, { status: 500 });
  }
}
