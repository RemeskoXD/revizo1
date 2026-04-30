import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SVJDashboardClient from './SVJDashboardClient';

export default async function SVJDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    include: {
      orders: {
        include: { revisionCategory: true },
        orderBy: { completedAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();

  const buildingsWithHealth = properties.map((p) => {
    const completedOrders = p.orders.filter(o => o.status === 'COMPLETED');
    const activeOrders = p.orders.filter(o => ['PENDING', 'IN_PROGRESS'].includes(o.status));

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

    const health = completedOrders.length === 0 ? 'unknown' :
      expiredRevisions.length > 0 ? 'red' :
      soonExpiring.length > 0 ? 'orange' : 'green';

    return {
      id: p.id,
      name: p.name,
      address: p.address,
      description: p.description,
      totalOrders: p.orders.length,
      completedOrders: completedOrders.length,
      activeOrders: activeOrders.length,
      expiredCount: expiredRevisions.length,
      soonCount: soonExpiring.length,
      health,
      createdAt: p.createdAt.toISOString(),
    };
  });

  const allOrders = properties.flatMap(p => p.orders);
  const completedAll = allOrders.filter(o => o.status === 'COMPLETED');
  const activeAll = allOrders.filter(o => ['PENDING', 'IN_PROGRESS'].includes(o.status));

  const allExpired = completedAll.filter(o => {
    const months = o.revisionCategory?.intervalMonths || 36;
    const completedDate = o.completedAt || o.updatedAt;
    const expires = new Date(completedDate);
    expires.setMonth(expires.getMonth() + months);
    return expires < now;
  });

  const allSoonExpiring = completedAll.filter(o => {
    const months = o.revisionCategory?.intervalMonths || 36;
    const completedDate = o.completedAt || o.updatedAt;
    const expires = new Date(completedDate);
    expires.setMonth(expires.getMonth() + months);
    const daysLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 90;
  });

  const upcomingRevisions = completedAll
    .map(o => {
      const months = o.revisionCategory?.intervalMonths || 36;
      const completedDate = o.completedAt || o.updatedAt;
      const expires = new Date(completedDate);
      expires.setMonth(expires.getMonth() + months);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const building = properties.find(p => p.id === o.propertyId);
      return {
        id: o.id,
        readableId: o.readableId,
        serviceType: o.serviceType,
        address: o.address,
        buildingName: building?.name || '',
        buildingId: building?.id || '',
        categoryName: o.revisionCategory?.name || null,
        completedAt: (o.completedAt || o.updatedAt).toISOString(),
        expiresAt: expires.toISOString(),
        daysLeft,
        status: daysLeft <= 0 ? 'expired' as const : daysLeft <= 90 ? 'warning' as const : daysLeft <= 180 ? 'soon' as const : 'ok' as const,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  return (
    <SVJDashboardClient
      userName={session.user.name}
      buildings={buildingsWithHealth}
      totalBuildings={properties.length}
      totalRevisions={completedAll.length}
      activeOrders={activeAll.length}
      expiredCount={allExpired.length}
      soonExpiringCount={allSoonExpiring.length}
      upcomingRevisions={upcomingRevisions}
    />
  );
}
