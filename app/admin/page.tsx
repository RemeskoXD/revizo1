import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) redirect('/login');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalUsers, totalOrders, completedOrders, cancelledOrders,
    pendingOrders, inProgressOrders, recentOrders,
    monthlyCompletedOrders, unassignedCount, pendingRoleRequests,
    totalByTechData, cancelledByTechData,
    pendingRegistrationsCount, openTicketsCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'COMPLETED' } }),
    prisma.order.count({ where: { status: 'CANCELLED' } }),
    prisma.order.count({ where: { status: 'PENDING' } }),
    prisma.order.count({ where: { status: 'IN_PROGRESS' } }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        customer: { select: { name: true, email: true } },
        technician: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { status: 'COMPLETED', completedAt: { gte: monthStart } },
      select: { price: true },
    }),
    prisma.order.count({
      where: { technicianId: null, companyId: null, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    prisma.roleRequest.count({ where: { status: 'PENDING' } }),
    prisma.order.groupBy({
      by: ['technicianId'],
      where: { technicianId: { not: null } },
      _count: { id: true },
    }),
    prisma.order.groupBy({
      by: ['technicianId'],
      where: { technicianId: { not: null }, status: 'CANCELLED' },
      _count: { id: true },
    }),
    prisma.user.count({ where: { accountStatus: 'PENDING_APPROVAL', isDeleted: false } }),
    prisma.supportTicket.count({ where: { status: 'OPEN' } }),
  ]);

  const monthlyRevenue = monthlyCompletedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  const conversionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

  const totalByTech = totalByTechData as unknown as { technicianId: string, _count: { id: number } }[];
  const cancelledByTech = cancelledByTechData as unknown as { technicianId: string, _count: { id: number } }[];

  const redFlagTechIds = (totalByTech || []).filter(t => {
    const total = t._count.id;
    if (total < 5) return false;
    const cancelled = (cancelledByTech || []).find(c => c.technicianId === t.technicianId)?._count.id || 0;
    return (cancelled / total) > 0.2;
  }).map(t => t.technicianId);

  let redFlagTechnicians: any[] = [];
  if (redFlagTechIds.length > 0) {
    const techs = await prisma.user.findMany({
      where: { id: { in: redFlagTechIds } },
      select: { id: true, name: true, email: true }
    });
    redFlagTechnicians = techs.map(t => {
      const total = (totalByTech || []).find(x => x.technicianId === t.id)?._count.id || 1;
      const cancelled = (cancelledByTech || []).find(x => x.technicianId === t.id)?._count.id || 0;
      return {
        id: t.id,
        name: t.name || t.email,
        cancelRate: Math.round((cancelled / total) * 100)
      };
    });
  }

  return (
    <AdminDashboardClient
      totalUsers={totalUsers}
      totalOrders={totalOrders}
      completedOrders={completedOrders}
      pendingOrders={pendingOrders}
      inProgressOrders={inProgressOrders}
      cancelledOrders={cancelledOrders}
      monthlyRevenue={monthlyRevenue}
      conversionRate={conversionRate}
      cancelRate={cancelRate}
      unassignedCount={unassignedCount}
      pendingRoleRequests={pendingRoleRequests}
      recentOrders={recentOrders}
      redFlagTechnicians={redFlagTechnicians}
      pendingRegistrationsCount={pendingRegistrationsCount}
      openTicketsCount={openTicketsCount}
      userRole={session.user.role}
    />
  );
}
