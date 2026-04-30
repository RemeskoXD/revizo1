import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const orders = await prisma.order.findMany({
    where: { customerId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return <OrdersClient orders={orders} />;
}
