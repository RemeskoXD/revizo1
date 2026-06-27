import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EarningsClient from './EarningsClient';

export default async function EarningsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  const commissionRate = user?.commissionRate || 90;

  const now = new Date();
  const months: { label: string; start: Date; end: Date }[] = [];
  for (let i = 0; i < 6; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    months.push({
      label: start.toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' }),
      start,
      end,
    });
  }

  const monthlyData = await Promise.all(
    months.map(async (m) => {
      const orders = await prisma.order.findMany({
        where: {
          technicianId: session.user.id,
          status: 'COMPLETED',
          completedAt: { gte: m.start, lte: m.end },
          isVerifiedAdmin: true, // Only show earnings when admin confirmed it
        },
        select: { id: true, readableId: true, serviceType: true, address: true, price: true, completedAt: true, customer: { select: { referredByRealtorId: true } } },
        orderBy: { completedAt: 'desc' },
      });
      const baseRate = (user?.commissionRate || 90) / 100;
      const revenue = orders.reduce((sum, o) => sum + (o.price || 0), 0);
      const earnings = orders.reduce((sum, o) => {
        const isReferredByMe = o.customer?.referredByRealtorId === session.user.id;
        const rate = isReferredByMe ? Math.min(1, baseRate + 0.05) : baseRate;
        return sum + (o.price || 0) * rate;
      }, 0);
      return {
        label: m.label,
        count: orders.length,
        revenue,
        earnings,
        orders: orders.map(o => {
          const isReferredByMe = o.customer?.referredByRealtorId === session.user.id;
          const rate = isReferredByMe ? Math.min(1, baseRate + 0.05) : baseRate;
          return { ...o, earnings: (o.price || 0) * rate, isReferredByMe };
        }),
      };
    })
  );

  const totalEarnings = monthlyData.reduce((sum, m) => sum + m.earnings, 0);
  const totalCount = monthlyData.reduce((sum, m) => sum + m.count, 0);

  return (
    <EarningsClient 
      monthlyData={monthlyData} 
      totalEarnings={totalEarnings} 
      totalCount={totalCount}
      commissionRate={commissionRate * 100}
      technician={user}
    />
  );
}
