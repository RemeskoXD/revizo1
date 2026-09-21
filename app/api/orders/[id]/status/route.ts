import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendOrderStatusEmail } from '@/lib/notifications';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const { status } = await req.json();

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: orderId },
          { readableId: orderId }
        ]
      },
      include: { property: true }
    });

    const isVlastni =
      order?.price === 0 ||
      Boolean(order?.serviceType && (
        order.serviceType.toLowerCase().includes('vlastní') ||
        order.serviceType.toLowerCase().includes('vlastni')
      ));

    const hasPermission =
      session.user.role === 'ADMIN' ||
      order?.customerId === session.user.id ||
      order?.property?.ownerId === session.user.id ||
      order?.property?.claimedById === session.user.id;

    if (!order || !hasPermission) {
      return NextResponse.json({ message: 'Objednávka nenalezena nebo nemáte oprávnění' }, { status: 404 });
    }

    if (status === 'CANCELLED') {
      if (order.status === 'CANCELLED') {
        return NextResponse.json({ message: 'Tato zakázka již byla zrušena.' }, { status: 400 });
      }
      // Dokončenou zakázku od technika nelze stornovat, ale vlastní revizi z trezoru zrušit/smazat lze
      if (order.status === 'COMPLETED' && !isVlastni && (order.price != null && order.price > 0)) {
        return NextResponse.json({ message: 'Dokončenou zakázku od technika již nelze stornovat.' }, { status: 400 });
      }

      // Pokud má zakázka přiřazeného technika a uživatel není administrátor, vytvoří se tiket na podporu
      const hasTechnicianAssigned = session.user.role !== 'ADMIN' && Boolean(order.technicianId || order.status === 'IN_PROGRESS' || order.status === 'SCHEDULED');
      if (hasTechnicianAssigned) {
        const userId = session.user.id;
        const ticket = await prisma.supportTicket.create({
          data: {
            userId,
            subject: `Žádost o storno zakázky #${order.readableId}`,
            category: 'ORDER_CANCELLATION',
            status: 'OPEN',
            messages: {
              create: {
                senderId: userId,
                text: `Uživatel požádal o zrušení zakázky s již přiřazeným technikem.\n\nČíslo zakázky: #${order.readableId}\nStav: ${order.status}\nAdresa: ${order.address}`,
              },
            },
          },
        });

        await prisma.activityLog.create({
          data: {
            userId,
            action: 'ORDER_CANCEL_REQUESTED',
            details: `Žádost o storno zakázky #${order.readableId} s přiřazeným technikem předána podpoře (tiket ${ticket.id}).`,
            targetId: order.id,
          },
        });

        return NextResponse.json({
          requiresSupport: true,
          ticketId: ticket.id,
          message: 'K zakázce je již přiřazen technik. Váš požadavek na storno byl předán zákaznické podpoře, která vás bude kontaktovat.',
        });
      }

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          isPublic: false,
        }
      });

      try {
        await prisma.activityLog.create({
          data: {
            userId: session.user.id,
            action: 'ORDER_CANCELLED',
            details: JSON.stringify({
              orderId: order.id,
              readableId: order.readableId,
              cancelledByRole: session.user.role,
            }),
            targetId: order.id
          }
        });
      } catch (logErr) {
        console.error('Activity log error:', logErr);
      }

      try {
        sendOrderStatusEmail(order.id, 'CANCELLED').catch(console.error);
      } catch (emailErr) {
        console.error('Email status error:', emailErr);
      }

      return NextResponse.json(updated);
    }

    if (order.price != null && order.price > 0) {
      return NextResponse.json({ message: 'Tuto zakázku vyřizuje certifikovaný technik. Stav můžete změnit pouze na "Zrušeno" v případě storna.' }, { status: 403 });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status }
    });

    // Log the status change
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'ORDER_STATUS_CHANGED',
        details: JSON.stringify({
          orderId: order.id,
          readableId: order.readableId,
          oldStatus: order.status,
          newStatus: status
        }),
        targetId: order.id
      }
    });

    sendOrderStatusEmail(order.id, status).catch(console.error);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
