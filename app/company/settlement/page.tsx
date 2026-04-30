import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SettlementClient from './SettlementClient';

export default async function SettlementPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COMPANY_ADMIN') redirect('/login');

  const technicians = await prisma.user.findMany({
    where: { companyId: session.user.id, role: 'TECHNICIAN' },
    select: { id: true, name: true, email: true, commissionRate: true },
    orderBy: { name: 'asc' },
  });

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

  const allCompletedOrders = await prisma.order.findMany({
    where: {
      companyId: session.user.id,
      status: 'COMPLETED',
      completedAt: { gte: months[months.length - 1].start },
    },
    select: { id: true, readableId: true, serviceType: true, address: true, price: true, completedAt: true, technicianId: true },
    orderBy: { completedAt: 'desc' },
  });

  const monthlyData = months.map((m) => {
    const monthOrders = allCompletedOrders.filter(o => o.completedAt && o.completedAt >= m.start && o.completedAt <= m.end);
    
    const perTechnician = technicians.map((tech) => {
      const techOrders = monthOrders.filter(o => o.technicianId === tech.id);
      const revenue = techOrders.reduce((sum, o) => sum + (o.price || 0), 0);
      const rate = (tech.commissionRate || 100) / 100;
      return {
        techId: tech.id,
        techName: tech.name || tech.email,
        commissionRate: tech.commissionRate || 100,
        orderCount: techOrders.length,
        revenue,
        payout: revenue * rate,
        orders: techOrders,
      };
    }).filter(t => t.orderCount > 0);

    const totalRevenue = monthOrders.reduce((sum, o) => sum + (o.price || 0), 0);
    const totalPayout = perTechnician.reduce((sum, t) => sum + t.payout, 0);

    return {
      label: m.label,
      totalRevenue,
      totalPayout,
      companyProfit: totalRevenue - totalPayout,
      orderCount: monthOrders.length,
      perTechnician,
    };
  });

  return <SettlementClient monthlyData={monthlyData} technicians={technicians} />;
}
