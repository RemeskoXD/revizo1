import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { OutstandingPaymentsClient } from '@/components/payments/OutstandingPaymentsClient';

export default async function SVJPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const orders = await prisma.order.findMany({
    where: {
      customerId: session.user.id,
      price: { gt: 0 }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <OutstandingPaymentsClient orders={orders} />;
}
