import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { checkAndReleaseExpiredOrders } from '@/lib/orderUtils';
import TechnicianDashboardClient from './TechnicianDashboardClient';

export default async function TechnicianDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login');

  await checkAndReleaseExpiredOrders();

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [openJobs, completedTotal, completedThisMonth, publicQueue, todaysJobs] = await Promise.all([
    prisma.order.count({
      where: { technicianId: session.user.id, status: { in: ['PENDING', 'IN_PROGRESS', 'NEEDS_REVISION'] } },
    }),
    prisma.order.count({
      where: { technicianId: session.user.id, status: 'COMPLETED' },
    }),
    prisma.order.findMany({
      where: { technicianId: session.user.id, status: 'COMPLETED', completedAt: { gte: monthStart } },
      select: { price: true },
    }),
    prisma.order.findMany({
      where: { isPublic: true, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { customer: { select: { name: true } } },
    }),
    prisma.order.findMany({
      where: { technicianId: session.user.id, status: { in: ['PENDING', 'IN_PROGRESS', 'NEEDS_REVISION'] } },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
      include: { customer: { select: { name: true, phone: true } } },
    }),
  ]);

  const commissionRate = (user?.commissionRate || 100) / 100;
  const monthlyEarnings = completedThisMonth.reduce((sum, o) => sum + (o.price || 0), 0) * commissionRate;
  const monthlyCount = completedThisMonth.length;

  const activeEarnings = await prisma.order.findMany({
    where: { technicianId: session.user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    select: { price: true },
  });
  const pendingEarnings = activeEarnings.reduce((sum, o) => sum + (o.price || 0), 0) * commissionRate;

  return (
    <TechnicianDashboardClient 
      user={user}
      openJobsCount={openJobs}
      completedTotal={completedTotal}
      monthlyEarnings={monthlyEarnings}
      monthlyCount={monthlyCount}
      pendingEarnings={pendingEarnings}
      publicQueue={publicQueue}
      publicQueueCount={publicQueue.length}
      todaysJobs={todaysJobs}
    />
  );
}
