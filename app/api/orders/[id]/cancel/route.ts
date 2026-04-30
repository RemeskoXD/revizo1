import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ip = getClientIp(req);
    const limited = rateLimit(`cancel:${ip}:${id}`, 40, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    let token: string | undefined;
    try {
      const body = await readJsonBody<{ token?: string }>(req, 8192);
      token = body.token != null ? String(body.token).trim().slice(0, 200) : undefined;
    } catch (e) {
      if (e instanceof PayloadTooLargeError) {
        return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
      }
      if (e instanceof SyntaxError) {
        return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
      }
      throw e;
    }

    const order = await prisma.order.findFirst({
      where: { OR: [{ id }, { readableId: id }] },
    });

    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isOwner = session && order.customerId === session.user.id;
    const isValidToken = token && order.cancelToken === token;

    if (!isOwner && !isValidToken) {
      return NextResponse.json({ message: 'Neautorizovaný přístup' }, { status: 403 });
    }

    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      return NextResponse.json(
        {
          message:
            order.status === 'COMPLETED'
              ? 'Dokončenou objednávku nelze zrušit'
              : 'Objednávka je již zrušena',
        },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });

    sendOrderStatusEmail(order.id, 'CANCELLED').catch(console.error);

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id || order.customerId,
        action: 'ORDER_CANCELLED',
        details: `Objednávka #${order.readableId} zrušena ${isValidToken ? 'přes e-mailový odkaz' : 'zákazníkem'}`,
        targetId: order.id,
      },
    });

    return NextResponse.json({ message: 'Objednávka byla zrušena' });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
