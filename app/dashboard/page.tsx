import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

type WatchdogItem = {
  id: string;
  readableId: string;
  serviceType: string;
  address: string;
  completedAt: string;
  expiresAt: string;
  daysLeft: number;
  categoryName: string | null;
  result: string | null;
  hasReport: boolean;
  status: 'expired' | 'warning' | 'soon' | 'ok';
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect('/login');
  if (session.user.role === 'PRODUCT_MANAGER') redirect('/product-manager');
  if (['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) redirect('/admin');
  if (session.user.role === 'COMPANY_ADMIN') redirect('/company');
  if (session.user.role === 'TECHNICIAN') redirect('/technician');
  if (session.user.role === 'REALTY') redirect('/realty');
  if (session.user.role === 'SVJ') redirect('/svj');

  const [recentOrders, activeOrdersCount, completedOrdersCount, completedOrders, defectTasks] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { revisionCategory: true },
    }),
    prisma.order.count({
      where: {
        customerId: session.user.id,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
      },
    }),
    prisma.order.count({
      where: { customerId: session.user.id, status: 'COMPLETED' },
    }),
    prisma.order.findMany({
      where: { customerId: session.user.id, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { revisionCategory: true },
    }),
    prisma.defectTask.findMany({
      where: { userId: session.user.id, status: { not: 'RESOLVED' } },
      include: { order: { select: { readableId: true, serviceType: true, address: true } } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    }),
  ]);

  const now = new Date();
  const watchdogItems: WatchdogItem[] = completedOrders.map((order: any) => {
    const months = order.revisionCategory?.intervalMonths || 36;
    const completedDate = order.completedAt ? new Date(order.completedAt) : new Date(order.updatedAt);
    const expires = new Date(completedDate);
    expires.setMonth(expires.getMonth() + months);
    const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      id: order.id,
      readableId: order.readableId,
      serviceType: order.serviceType,
      address: order.address,
      completedAt: completedDate.toISOString(),
      expiresAt: expires.toISOString(),
      daysLeft,
      categoryName: order.revisionCategory?.name || null,
      result: order.revisionResult,
      hasReport: !!order.reportFile,
      status: (daysLeft <= 0 ? 'expired' : daysLeft <= 90 ? 'warning' : daysLeft <= 180 ? 'soon' : 'ok') as WatchdogItem['status'],
    };
  }).sort((a: WatchdogItem, b: WatchdogItem) => a.daysLeft - b.daysLeft);

  return (
    <DashboardClient 
      user={session.user} 
      recentOrders={recentOrders}
      activeOrdersCount={activeOrdersCount} 
      completedOrdersCount={completedOrdersCount}
      watchdogItems={watchdogItems}
      defectTasks={defectTasks}
    />
  );
}
