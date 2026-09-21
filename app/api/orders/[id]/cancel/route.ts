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
        property: { select: { ownerId: true, claimedById: true } },
        customer: { select: { id: true, email: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ message: 'Objednávka nenalezena' }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'ADMIN' || session?.user?.role === 'SUPPORT';
    const isOwner =
      session &&
      (order.customerId === session.user.id ||
        order.property?.ownerId === session.user.id ||
        order.property?.claimedById === session.user.id ||
        Boolean(session.user.email && order.customer?.email && session.user.email.toLowerCase() === order.customer.email.toLowerCase()) ||
        isAdmin);
    const isValidToken = token && order.cancelToken === token;

    if (!isOwner && !isValidToken) {
      return NextResponse.json({ message: 'Neautorizovaný přístup' }, { status: 403 });
    }

    const isVlastni =
      order.price === 0 ||
      Boolean(order.serviceType && (
        order.serviceType.toLowerCase().includes('vlastní') ||
        order.serviceType.toLowerCase().includes('vlastni')
      ));

    if (order.status === 'CANCELLED') {
      return NextResponse.json({ message: 'Objednávka je již zrušena' }, { status: 400 });
    }

    if (order.status === 'COMPLETED' && !isVlastni && (order.price != null && order.price > 0)) {
      return NextResponse.json({ message: 'Dokončenou objednávku od technika nelze zrušit' }, { status: 400 });
    }

    // Dvoufázové storno:
    // Pokud si technik zakázku již převzal (technicianId nebo IN_PROGRESS / SCHEDULED) a neruší to admin,
    // vytvoří se tiket na zákaznickou podporu.
    const hasTechnicianAssigned = !isAdmin && Boolean(order.technicianId || order.status === 'IN_PROGRESS' || order.status === 'SCHEDULED');

    if (hasTechnicianAssigned) {
      const effectiveReason = reason && reason.trim().length > 0
        ? reason.trim()
        : 'Zákazník požádal o storno zakázky v aplikaci po převzetí technikem.';

      const userId = session?.user?.id || order.customerId;

      // Zkontrolujeme, zda již neexistuje otevřený tiket pro storno této zakázky
      const existingTicket = await prisma.supportTicket.findFirst({
        where: {
          category: 'ORDER_CANCELLATION',
          subject: { contains: order.readableId },
          status: 'OPEN',
        },
      });

      let ticketId: string;
      if (existingTicket) {
        ticketId = existingTicket.id;
        await prisma.supportTicketMessage.create({
          data: {
            ticketId: existingTicket.id,
            senderId: userId,
            text: `Zákazník opětovně požádal o storno zakázky s přiřazeným technikem.\n\nČíslo zakázky: #${order.readableId}\nDůvod/poznámka: ${effectiveReason}`,
          },
        });
      } else {
        const ticket = await prisma.supportTicket.create({
          data: {
            userId,
            subject: `Žádost o storno zakázky #${order.readableId}`,
            category: 'ORDER_CANCELLATION',
            status: 'OPEN',
            messages: {
              create: {
                senderId: userId,
                text: `Zákazník požádal o storno zakázky s již přiřazeným technikem.\n\nČíslo zakázky: #${order.readableId}\nDůvod / poznámka: ${effectiveReason}\nStav zakázky: ${order.status}\nAdresa: ${order.address}\nTermín: ${order.preferredDate ? new Date(order.preferredDate).toLocaleDateString('cs-CZ') : 'Nespecifikován'}`,
              },
            },
          },
        });
        ticketId = ticket.id;
      }

      await prisma.activityLog.create({
        data: {
          userId,
          action: 'ORDER_CANCEL_REQUESTED',
          details: `Žádost o storno zakázky #${order.readableId} s přiřazeným technikem předána podpoře (tiket ${ticketId}). Důvod: ${effectiveReason.slice(0, 150)}`,
          targetId: order.id,
        },
      });

      return NextResponse.json({
        requiresSupport: true,
        ticketId,
        message: 'K zakázce je již přiřazen technik. Váš požadavek na storno byl předán zákaznické podpoře (tiket byl vytvořen), která vás bude neprodleně kontaktovat a vyřídí storno s technikem.',
      });
    }

    // Pokud technik ještě není přiřazen nebo stornuje admin, zakázka se stornuje ihned a bezplatně na 1 klik
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'CANCELLED',
        isPublic: false,
      },
    });

    // Uzavřít případné tikety žádající o storno této zakázky
    try {
      await prisma.supportTicket.updateMany({
        where: {
          category: 'ORDER_CANCELLATION',
          subject: { contains: order.readableId },
          status: 'OPEN',
        },
        data: { status: 'RESOLVED' },
      });
    } catch {
      // ignorovat případnou chybu při uzavírání tiketu
    }

    sendOrderStatusEmail(order.id, 'CANCELLED').catch(console.error);

    await prisma.activityLog.create({
      data: {
        userId: session?.user?.id || order.customerId,
        action: 'ORDER_CANCELLED',
        details: `Objednávka #${order.readableId} zrušena ${isAdmin ? 'administrátorem' : isValidToken ? 'přes odkaz' : 'klientem'}`,
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
