import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RadarClient from './RadarClient';

export default async function RadarPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COMPANY_ADMIN') redirect('/login');

  const publicOrders = await prisma.order.findMany({
    where: { isPublic: true, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { customer: { select: { name: true } } },
  });

  const technicians = await prisma.user.findMany({
    where: { companyId: session.user.id, role: 'TECHNICIAN' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return <RadarClient orders={publicOrders} technicians={technicians} />;
}
