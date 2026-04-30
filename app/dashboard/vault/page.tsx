import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import VaultClient from './VaultClient';

export default async function VaultPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const completedOrders = await prisma.order.findMany({
    where: {
      customerId: session.user.id,
      status: 'COMPLETED',
    },
    orderBy: { updatedAt: 'desc' },
    include: { revisionCategory: true },
  });

  return <VaultClient completedOrders={completedOrders} />;
}
