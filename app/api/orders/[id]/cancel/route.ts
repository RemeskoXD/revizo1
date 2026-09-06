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
    let reason: string | undefined;
    try {
      const body = await readJsonBody<{ token?: string; reason?: string }>(req, 8192);
      token = body.token != null ? String(body.token).trim().slice(0, 200) : undefined;
      reason = body.reason != null ? String(body.reason).trim().slice(0, 1000) : undefined;
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
      include: {
        property: { select: { ownerId: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isOwner =
      session &&
      (order.customerId === session.user.id ||
        order.property?.ownerId === session.user.id ||
        session.user.role === 'ADMIN');
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

    // Dvoufázové storno: má-li zakázka přiřazeného technika nebo probíhá, vytvoří se tiket na podporu
    const hasTechnicianAssigned = Boolean(order.technicianId || order.status === 'IN_PROGRESS');

    if (hasTechnicianAssigned) {
      if (!reason || reason.trim().length < 5) {
        return NextResponse.json(
          { message: 'K zakázce je již přiřazen technik. Uveďte prosím důvod storna (min. 5 znaků).' },
          { status: 400 }
        );
      }

      const userId = session?.user?.id || order.customerId;
      await prisma.supportTicket.create({
        data: {
          userId,
          subject: `Žádost o storno zakázky #${order.readableId}`,
          category: 'ORDER_CANCELLATION',
          status: 'OPEN',
          messages: {
            create: {
              senderId: userId,
              text: `Zákazník požádal o storno zakázky s již přiřazeným technikem.\n\nČíslo zakázky: #${order.readableId}\nDůvod: ${reason.trim()}\nStav zakázky: ${order.status}\nAdresa: ${order.address}\nTermín: ${order.preferredDate ? new Date(order.preferredDate).toLocaleDateString('cs-CZ') : 'Nespecifikován'}`,
            },
          },
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: session?.user?.id || order.customerId,
          action: 'ORDER_CANCEL_REQUESTED',
          details: `Žádost o storno zakázky #${order.readableId} s přiřazeným technikem byla předána podpoře. Důvod: ${reason.trim().slice(0, 150)}`,
          targetId: order.id,
        },
      });

      return NextResponse.json({
        requiresSupport: true,
        message: 'K zakázce je již přiřazen technik. Váš požadavek na storno byl předán zákaznické podpoře, která vás bude neprodleně kontaktovat.',
      });
    }

    // Pokud technik ještě není přiřazen a zakázka neprobíhá, stornuje se ihned
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    });

    sendOrderStatusEmail(order.id, 'CANCELLED').catch(console.error);

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id || order.customerId,
        action: 'ORDER_CANCELLED',
        details: `Objednávka #${order.readableId} zrušena ${isValidToken ? 'přes odkaz' : 'klientem'}`,
        targetId: order.id,
      },
    });

    return NextResponse.json({
      cancelled: true,
      message: 'Objednávka byla úspěšně zrušena.',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
