import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { expiryWarningEmail, expiryExpiredEmail } from '@/lib/email-templates';
import { notifyRevisionExpired, notifyRevisionExpiryWarning } from '@/lib/notifications';

const REMINDER_DAYS = [30, 14, 7, 2, 1];
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provided = searchParams.get('secret');

  if (process.env.NODE_ENV === 'production') {
    if (!CRON_SECRET) {
      return NextResponse.json(
        { message: 'Cron disabled: set CRON_SECRET in the server environment.' },
        { status: 503 }
      );
    }
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  } else if (CRON_SECRET && provided !== CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const completedOrders = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        isDeleted: false,
        nextRevisionDate: { not: null },
      },
      include: {
        customer: {
          select: { id: true, name: true, email: true, emailNotifications: true },
        },
        revisionCategory: { select: { intervalMonths: true } },
        property: {
          select: {
            owner: { select: { id: true, name: true, email: true, emailNotifications: true } },
          },
        },
      },
    });

    const now = new Date();
    let emailsSent = 0;
    let notificationsSent = 0;
    let errorsCount = 0;

    for (const order of completedOrders) {
      const expiresAt = order.nextRevisionDate!;
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const recipient = order.property?.owner || order.customer;
      if (!recipient?.email || !recipient.emailNotifications) continue;

      let shouldSendDay: number | null = null;

      if (daysLeft > 0) {
        for (const day of REMINDER_DAYS) {
          if (daysLeft <= day) {
            shouldSendDay = day;
          }
        }
        if (shouldSendDay === null) continue;

        if (order.lastExpiryEmailDays !== null && order.lastExpiryEmailDays <= shouldSendDay) {
          continue;
        }

        const emailData = expiryWarningEmail({
          userName: recipient.name || 'zákazníku',
          serviceType: order.serviceType,
          address: order.address,
          readableId: order.readableId,
          daysLeft,
          expiresAt: expiresAt.toISOString(),
        });

        try {
          await sendMail({ to: recipient.email, ...emailData });
          await prisma.order.update({
            where: { id: order.id },
            data: { lastExpiryEmailDays: shouldSendDay },
          });
          emailsSent++;
          try {
            await notifyRevisionExpiryWarning({
              userId: recipient.id,
              orderReadableId: order.readableId,
              serviceType: order.serviceType,
              address: order.address,
              daysLeft,
            });
            notificationsSent++;
          } catch (e) {
            console.error(`Failed to create expiry notification for order ${order.readableId}:`, e);
            errorsCount++;
          }
        } catch (e) {
          console.error(`Failed to send expiry warning for order ${order.readableId}:`, e);
          errorsCount++;
        }
      } else if (daysLeft <= 0) {
        const expiredDaysAgo = Math.abs(daysLeft);

        if (order.lastExpiryEmailDays === 0 && expiredDaysAgo < 7) continue;
        if (order.lastExpiryEmailDays === -1) continue;

        const emailData = expiryExpiredEmail({
          userName: recipient.name || 'zákazníku',
          serviceType: order.serviceType,
          address: order.address,
          readableId: order.readableId,
          expiredDaysAgo: Math.max(expiredDaysAgo, 1),
        });

        try {
          await sendMail({ to: recipient.email, ...emailData });
          await prisma.order.update({
            where: { id: order.id },
            data: { lastExpiryEmailDays: expiredDaysAgo === 0 ? 0 : -1 },
          });
          emailsSent++;
          try {
            await notifyRevisionExpired({
              userId: recipient.id,
              orderReadableId: order.readableId,
              serviceType: order.serviceType,
              address: order.address,
              expiredDaysAgo: Math.max(expiredDaysAgo, 1),
            });
            notificationsSent++;
          } catch (e) {
            console.error(`Failed to create expired notification for order ${order.readableId}:`, e);
            errorsCount++;
          }
        } catch (e) {
          console.error(`Failed to send expired email for order ${order.readableId}:`, e);
          errorsCount++;
        }
      }
    }

    return NextResponse.json({
      processed: completedOrders.length,
      emailsSent,
      notificationsSent,
      errors: errorsCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Cron expiry-reminders error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
