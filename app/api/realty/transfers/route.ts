import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'REALTY') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`realty-tr:${session.user.id}`, 40, 24 * 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho převodů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ receiverEmail?: string; documentId?: string }>(req, 8192);
    const receiverEmail =
      body.receiverEmail != null ? String(body.receiverEmail).trim().toLowerCase().slice(0, 254) : '';
    const documentId = body.documentId != null ? String(body.documentId).trim().slice(0, 120) : '';

    if (!receiverEmail || !documentId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }
    if (!EMAIL_RE.test(receiverEmail)) {
      return NextResponse.json({ message: 'Invalid email' }, { status: 400 });
    }

    const receiver = await prisma.user.findUnique({
      where: { email: receiverEmail },
    });

    if (!receiver) {
      return NextResponse.json({ message: 'Receiver not found' }, { status: 404 });
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id: documentId }, { readableId: documentId }] },
    });

    if (!order || order.customerId !== session.user.id || order.status !== 'COMPLETED') {
      return NextResponse.json({ message: 'Invalid document' }, { status: 400 });
    }

    const transfer = await prisma.documentTransfer.create({
      data: {
        senderId: session.user.id,
        receiverId: receiver.id,
        documentId: order.readableId,
        status: 'PENDING',
      },
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Create transfer error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
