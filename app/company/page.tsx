import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { checkAndReleaseExpiredOrders } from '@/lib/orderUtils';
import CompanyDashboardClient from './CompanyDashboardClient';

export default async function CompanyDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COMPANY_ADMIN') redirect('/login');

  await checkAndReleaseExpiredOrders();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    technicians, activeOrders, completedThisMonth, unassignedCount, 
    publicOrders, recentOrders, joinRequestsCount
  ] = await Promise.all([
    prisma.user.findMany({
      where: { companyId: session.user.id, role: 'TECHNICIAN' },
      select: { 
        id: true, name: true, email: true, phone: true, commissionRate: true, priority: true,
        assignedOrders: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS', 'NEEDS_REVISION'] } },
          select: { id: true, serviceType: true, address: true, status: true, scheduledDate: true, readableId: true },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.order.count({
      where: { companyId: session.user.id, status: { in: ['PENDING', 'IN_PROGRESS', 'NEEDS_REVISION'] } },
    }),
    prisma.order.findMany({
      where: { companyId: session.user.id, status: 'COMPLETED', completedAt: { gte: monthStart } },
      select: { price: true, technicianId: true },
    }),
    prisma.order.count({
      where: { companyId: session.user.id, technicianId: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    prisma.order.findMany({
      where: { isPublic: true, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, readableId: true, serviceType: true, address: true, price: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { companyId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: { customer: { select: { name: true } }, technician: { select: { name: true } } },
    }),
    prisma.companyJoinRequest.count({
      where: { companyId: session.user.id, status: 'PENDING' },
    }),
  ]);

  const monthlyRevenue = completedThisMonth.reduce((sum, o) => sum + (o.price || 0), 0);
  const monthlyCount = completedThisMonth.length;

  return (
    <CompanyDashboardClient
      companyName={session.user.name}
      technicians={technicians}
      activeOrders={activeOrders}
      monthlyRevenue={monthlyRevenue}
      monthlyCount={monthlyCount}
      unassignedCount={unassignedCount}
      publicOrders={publicOrders}
      recentOrders={recentOrders}
      joinRequestsCount={joinRequestsCount}
    />
  );
}
