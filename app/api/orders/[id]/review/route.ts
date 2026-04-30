import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notifyReviewReceived } from '@/lib/notifications';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const body = await readJsonBody<{ rating?: number; comment?: string | null }>(req, 32_768);
    const rating = Number(body.rating);
    const comment = body.comment != null ? String(body.comment).slice(0, 4000) : null;

    if (!Number.isFinite(rating) || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return NextResponse.json({ message: 'Hodnocení musí být 1-5' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
    });
    if (!order) return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    if (order.customerId !== session.user.id) {
      return NextResponse.json({ message: 'Nemáte oprávnění' }, { status: 403 });
    }
    if (order.status !== 'COMPLETED') {
      return NextResponse.json({ message: 'Objednávka není dokončena' }, { status: 400 });
    }
    if (!order.technicianId) {
      return NextResponse.json({ message: 'Objednávka nemá technika' }, { status: 400 });
    }

    const existing = await prisma.review.findUnique({ where: { orderId: order.id } });
    if (existing) return NextResponse.json({ message: 'Již jste hodnotili' }, { status: 400 });

    const rl = rateLimit(`review:${session.user.id}:${order.id}`, 8, 24 * 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů o hodnocení. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const review = await prisma.review.create({
      data: {
        orderId: order.id,
        customerId: session.user.id,
        technicianId: order.technicianId,
        rating,
        comment,
      },
    });

    await notifyReviewReceived(order.technicianId, rating, order.readableId);

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Příliš velká data' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Create review error:', error);
    return NextResponse.json({ message: 'Interní chyba' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
    });
    if (!order) return NextResponse.json(null);

    const review = await prisma.review.findUnique({
      where: { orderId: order.id },
      include: { customer: { select: { name: true } } },
    });

    return NextResponse.json(review);
  } catch {
    return NextResponse.json(null);
  }
}
