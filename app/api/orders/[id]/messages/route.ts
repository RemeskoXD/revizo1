import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { notifyOrderChatMessage } from '@/lib/notifications';

const MAX_CONTENT = 8000;

function orderAccess(
  session: { user: { id: string; role: string } },
  order: { customerId: string; technicianId: string | null; companyId: string | null; isPublic: boolean }
) {
  const role = session.user.role;
  const uid = session.user.id;
  if (role === 'ADMIN') return true;
  if (order.customerId === uid) return true;
  if (order.technicianId === uid) return true;
  if (order.companyId === uid) return true;
  if (role === 'COMPANY_ADMIN' && order.companyId === uid) return true;
  if (order.isPublic && (role === 'TECHNICIAN' || role === 'COMPANY_ADMIN')) return true;
  return false;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
    });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (!orderAccess(session as { user: { id: string; role: string } }, order)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { orderId: order.id },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ message: 'Error fetching messages' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
    });
    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });

    if (!orderAccess(session as { user: { id: string; role: string } }, order)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const rl = rateLimit(`msg:${session.user.id}:${order.id}`, 150, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho zpráv. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ content?: string }>(req, Math.min(MAX_CONTENT + 1024, 32_768));
    const raw = body.content;
    if (!raw || typeof raw !== 'string') {
      return NextResponse.json({ message: 'Content is required' }, { status: 400 });
    }
    const content = raw.trim().slice(0, MAX_CONTENT);
    if (!content) {
      return NextResponse.json({ message: 'Content is required' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        orderId: order.id,
        senderId: session.user.id,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    const senderRole = session.user.role;
    const isFromCustomer = order.customerId === session.user.id;
    if (isFromCustomer && order.technicianId) {
      await notifyOrderChatMessage({
        recipientId: order.technicianId,
        orderReadableId: order.readableId,
        senderRole,
        isFromCustomer: true,
        content,
      });
    } else if (!isFromCustomer) {
      await notifyOrderChatMessage({
        recipientId: order.customerId,
        orderReadableId: order.readableId,
        senderRole,
        isFromCustomer: false,
        content,
      });
    }

    return NextResponse.json(message);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Zpráva je příliš dlouhá' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating message' }, { status: 500 });
  }
}
