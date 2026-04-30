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
    techniciansWithStats
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
    prisma.user.findMany({
      where: { role: 'TECHNICIAN' },
      select: {
        id: true, name: true, email: true,
        assignedOrders: { select: { status: true } },
      },
    }),
  ]);

  const monthlyRevenue = monthlyCompletedOrders.reduce((sum, o) => sum + (o.price || 0), 0);

  const conversionRate = totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0;
  const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

  const redFlagTechnicians = techniciansWithStats.filter(t => {
    const total = t.assignedOrders.length;
    const cancelled = t.assignedOrders.filter(o => o.status === 'CANCELLED').length;
    return total >= 5 && (cancelled / total) > 0.2;
  }).map(t => ({ id: t.id, name: t.name || t.email, cancelRate: Math.round((t.assignedOrders.filter(o => o.status === 'CANCELLED').length / t.assignedOrders.length) * 100) }));

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
      userRole={session.user.role}
    />
  );
}
