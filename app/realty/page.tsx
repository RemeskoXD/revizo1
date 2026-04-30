import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RealtyDashboardClient from './RealtyDashboardClient';

export default async function RealtyDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'REALTY') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    include: {
      orders: {
        include: { revisionCategory: true },
        orderBy: { completedAt: 'desc' },
      },
      claimedBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const pendingTransfers = await prisma.property.count({
    where: { ownerId: session.user.id, transferStatus: 'CLAIMED' },
  });

  const now = new Date();

  const propertiesWithHealth = properties.map((p) => {
    const completedOrders = p.orders.filter(o => o.status === 'COMPLETED');
    const expiredRevisions = completedOrders.filter(o => {
      const months = o.revisionCategory?.intervalMonths || 36;
      const completedDate = o.completedAt || o.updatedAt;
      const expires = new Date(completedDate);
      expires.setMonth(expires.getMonth() + months);
      return expires < now;
    });
    const soonExpiring = completedOrders.filter(o => {
      const months = o.revisionCategory?.intervalMonths || 36;
      const completedDate = o.completedAt || o.updatedAt;
      const expires = new Date(completedDate);
      expires.setMonth(expires.getMonth() + months);
      const daysLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 90;
    });
    const activeOrders = p.orders.filter(o => ['PENDING', 'IN_PROGRESS'].includes(o.status));

    const health = completedOrders.length === 0 ? 'unknown' :
      expiredRevisions.length > 0 ? 'red' :
      soonExpiring.length > 0 ? 'orange' : 'green';

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      description: p.description,
      transferStatus: p.transferStatus,
      transferToken: p.transferToken,
      claimedBy: p.claimedBy,
      totalOrders: p.orders.length,
      completedOrders: completedOrders.length,
      activeOrders: activeOrders.length,
      expiredCount: expiredRevisions.length,
      soonCount: soonExpiring.length,
      health,
      createdAt: p.createdAt.toISOString(),
    };
  });

  const greenCount = propertiesWithHealth.filter(p => p.health === 'green').length;
  const redCount = propertiesWithHealth.filter(p => p.health === 'red').length;
  const orangeCount = propertiesWithHealth.filter(p => p.health === 'orange').length;

  return (
    <RealtyDashboardClient
      userName={session.user.name}
      properties={propertiesWithHealth}
      pendingTransfers={pendingTransfers}
      greenCount={greenCount}
      redCount={redCount}
      orangeCount={orangeCount}
    />
  );
}
