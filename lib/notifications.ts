import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { orderStatusEmail } from '@/lib/email-templates';
import { dispatchNotificationWebhook } from '@/lib/notification-webhook';

type NotificationType = 'ORDER_ASSIGNED' | 'ORDER_COMPLETED' | 'REVISION_EXPIRING' | 'MESSAGE' | 'TECHNICIAN_SCHEDULED' | 'DEFECT_CREATED' | 'ORDER_STATUS_CHANGED' | 'REVIEW_RECEIVED';

export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}) {
  try {
    const n = await prisma.notification.create({ data: params });
    dispatchNotificationWebhook({
      id: n.id,
      userId: n.userId,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link ?? null,
      createdAt: n.createdAt,
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyOrderAssigned(orderId: string, orderReadableId: string, customerId: string, technicianName: string) {
  const link = await orderDetailLinkForOrderOwner(customerId, orderReadableId);
  await createNotification({
    userId: customerId,
    type: 'ORDER_ASSIGNED',
    title: 'Technik přiřazen',
    message: `Objednávku #${orderReadableId} přijal technik ${technicianName}.`,
    link,
  });
}

export async function notifyOrderCompleted(orderId: string, orderReadableId: string, customerId: string, result: string) {
  const resultLabel = result === 'PASS' ? 'bez závad' : result === 'FAIL' ? 'nevyhovuje' : 's výhradami';
  const link = await orderDetailLinkForOrderOwner(customerId, orderReadableId);
  await createNotification({
    userId: customerId,
    type: 'ORDER_COMPLETED',
    title: 'Revize dokončena',
    message: `Revize #${orderReadableId} byla dokončena – výsledek: ${resultLabel}. Zpráva je ke stažení.`,
    link,
  });
}

export async function notifyScheduleSet(orderReadableId: string, customerId: string, date: string) {
  const link = await orderDetailLinkForOrderOwner(customerId, orderReadableId);
  await createNotification({
    userId: customerId,
    type: 'TECHNICIAN_SCHEDULED',
    title: 'Termín potvrzen',
    message: `Technik potvrdil termín revize #${orderReadableId} na ${date}.`,
    link,
  });
}

export async function notifyNewOrder(technicianId: string, orderReadableId: string, serviceType: string) {
  await createNotification({
    userId: technicianId,
    type: 'ORDER_ASSIGNED',
    title: 'Nová zakázka',
    message: `Byla vám přiřazena zakázka #${orderReadableId} – ${serviceType}.`,
    link: `/technician/job/${orderReadableId}`,
  });
}

export async function notifyDefectCreated(customerId: string, orderReadableId: string) {
  const link = await orderDetailLinkForOrderOwner(customerId, orderReadableId);
  await createNotification({
    userId: customerId,
    type: 'DEFECT_CREATED',
    title: 'Zjištěna závada',
    message: `Při revizi #${orderReadableId} byly zjištěny závady. Podívejte se na úkoly.`,
    link,
  });
}

/** Upozornění + webhook ve stejném okamžiku jako e-mail upomínka expirace (cron). */
export async function notifyRevisionExpiryWarning(params: {
  userId: string;
  orderReadableId: string;
  serviceType: string;
  address: string;
  daysLeft: number;
}) {
  const { userId, orderReadableId, serviceType, address, daysLeft } = params;
  const link = await orderDetailLinkForOrderOwner(userId, orderReadableId);
  await createNotification({
    userId,
    type: 'REVISION_EXPIRING',
    title: 'Blíží se konec platnosti revize',
    message: `Za ${daysLeft} dní vyprší platnost revize ${serviceType} (${address}) – objednávka #${orderReadableId}.`,
    link,
  });
}

export async function notifyRevisionExpired(params: {
  userId: string;
  orderReadableId: string;
  serviceType: string;
  address: string;
  expiredDaysAgo: number;
}) {
  const { userId, orderReadableId, serviceType, address, expiredDaysAgo } = params;
  const link = await orderDetailLinkForOrderOwner(userId, orderReadableId);
  await createNotification({
    userId,
    type: 'REVISION_EXPIRING',
    title: 'Platnost revize vypršela',
    message: `Platnost revize ${serviceType} (${address}) u objednávky #${orderReadableId} vypršela${expiredDaysAgo > 0 ? ` před ${expiredDaysAgo} dny` : ''}.`,
    link,
  });
}

export async function notifyReviewReceived(technicianId: string, rating: number, orderReadableId: string) {
  await createNotification({
    userId: technicianId,
    type: 'REVIEW_RECEIVED',
    title: 'Nové hodnocení',
    message: `Zákazník ohodnotil revizi #${orderReadableId} – ${rating}/5 hvězd.`,
    link: `/technician/job/${orderReadableId}`,
  });
}

const MESSAGE_PREVIEW_LEN = 120;

function previewText(text: string) {
  const t = text.trim();
  if (t.length <= MESSAGE_PREVIEW_LEN) return t;
  return `${t.slice(0, MESSAGE_PREVIEW_LEN)}…`;
}

async function orderDetailLinkForOrderOwner(recipientId: string, orderReadableId: string) {
  const user = await prisma.user.findUnique({ where: { id: recipientId }, select: { role: true } });
  if (user?.role === 'SVJ') return `/svj/orders/${orderReadableId}`;
  if (user?.role === 'REALTY') return `/realty/orders/${orderReadableId}`;
  return `/dashboard/orders/${orderReadableId}`;
}

/** Upozornění příjemce o nové zprávě u zakázky (zákazník ↔ technik/firma). */
export async function notifyOrderChatMessage(params: {
  recipientId: string;
  orderReadableId: string;
  senderRole: string;
  isFromCustomer: boolean;
  content: string;
}) {
  const { recipientId, orderReadableId, senderRole, isFromCustomer, content } = params;
  const preview = previewText(content);

  if (isFromCustomer) {
    await createNotification({
      userId: recipientId,
      type: 'MESSAGE',
      title: 'Nová zpráva od zákazníka',
      message: `Objednávka #${orderReadableId}: ${preview}`,
      link: `/technician/job/${orderReadableId}`,
    });
    return;
  }

  const title =
    senderRole === 'TECHNICIAN'
      ? 'Technik vám odpověděl'
      : senderRole === 'COMPANY_ADMIN'
        ? 'Nová zpráva od firmy'
        : 'Nová zpráva u zakázky';

  const link = await orderDetailLinkForOrderOwner(recipientId, orderReadableId);

  await createNotification({
    userId: recipientId,
    type: 'MESSAGE',
    title,
    message: `Objednávka #${orderReadableId}: ${preview}`,
    link,
  });
}

export async function sendOrderStatusEmail(orderId: string, newStatus: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, email: true, emailNotifications: true } },
        technician: { select: { name: true } },
      },
    });
    if (!order?.customer?.email || !order.customer.emailNotifications) return;

    const emailData = orderStatusEmail({
      readableId: order.readableId,
      serviceType: order.serviceType,
      address: order.address,
      newStatus,
      technicianName: order.technician?.name,
      scheduledDate: order.scheduledDate?.toISOString(),
      customerName: order.customer.name,
    });

    await sendMail({
      to: order.customer.email,
      ...emailData,
      meta: { type: 'ORDER_STATUS', orderId: order.id, userId: order.customerId },
    });
  } catch (error) {
    console.error('Failed to send order status email:', error);
  }
}
