import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`share-create:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho odkazů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const { orderIds, label, expiresInDays } = await readJsonBody<{
      orderIds?: unknown;
      label?: string | null;
      expiresInDays?: number | null;
    }>(req, 48_384);

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ message: 'Vyberte alespoň jednu revizi' }, { status: 400 });
    }

    if (orderIds.length > 50) {
      return NextResponse.json({ message: 'Maximum 50 objednávek' }, { status: 400 });
    }

    const sanitizedIds = orderIds
      .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 80)
      .slice(0, 50);
    if (sanitizedIds.length === 0) {
      return NextResponse.json({ message: 'Neplatné identifikátory objednávek' }, { status: 400 });
    }

    const orders = await prisma.order.findMany({
      where: { id: { in: sanitizedIds }, customerId: session.user.id, status: 'COMPLETED' },
      select: { id: true },
    });

    if (orders.length === 0) {
      return NextResponse.json({ message: 'Žádné platné revize k sdílení' }, { status: 400 });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const days =
      typeof expiresInDays === 'number' && Number.isFinite(expiresInDays)
        ? Math.min(365, Math.max(0, Math.floor(expiresInDays)))
        : 0;
    const expiresAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        userId: session.user.id,
        label: label != null ? String(label).slice(0, 200) : null,
        orderIds: JSON.stringify(orders.map(o => o.id)),
        expiresAt,
      },
    });

    return NextResponse.json({ token: shareLink.token, url: `/share/${shareLink.token}` });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Create share link error:', error);
    return NextResponse.json({ message: 'Interní chyba' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const links = await prisma.shareLink.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error('Get share links error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
