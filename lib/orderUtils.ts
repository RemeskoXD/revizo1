import { prisma } from '@/lib/prisma';

async function getPublicTimeoutHours(): Promise<number> {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'public_timeout_hours' } });
    return config ? parseInt(config.value, 10) || 24 : 24;
  } catch {
    return 24;
  }
}

export async function checkAndReleaseExpiredOrders() {
  try {
    const timeoutHours = await getPublicTimeoutHours();
    const cutoff = new Date(Date.now() - timeoutHours * 60 * 60 * 1000);

    const expiredOrders = await prisma.order.findMany({
      where: {
        status: 'PENDING',
        isDeleted: false,
        assignedAt: { lt: cutoff },
        isPublic: false,
      },
    });

    if (expiredOrders.length > 0) {
      await prisma.order.updateMany({
        where: { id: { in: expiredOrders.map(o => o.id) } },
        data: {
          technicianId: null,
          companyId: null,
          isPublic: true,
          assignedAt: null,
        },
      });
    }
  } catch (error) {
    console.error('Error checking expired orders:', error);
  }
}
