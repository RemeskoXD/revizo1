import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BuildingsClient from './BuildingsClient';

export default async function BuildingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    include: {
      orders: {
        include: { revisionCategory: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();

  const serializedBuildings = properties.map(p => {
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

  return <BuildingsClient initialBuildings={serializedBuildings} />;
}
