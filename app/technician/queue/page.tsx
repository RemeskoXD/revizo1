import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { checkAndReleaseExpiredOrders } from '@/lib/orderUtils';
import TechnicianQueueClient from './TechnicianQueueClient';

export default async function TechnicianQueuePage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login');

  await checkAndReleaseExpiredOrders();

  const jobs = await prisma.order.findMany({
    where: {
      OR: [
        { technicianId: session.user.id, status: { not: 'CANCELLED' } },
        { isPublic: true, status: 'PENDING' }
      ]
    },
    orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'desc' }],
    include: { customer: { select: { name: true, email: true, phone: true } } }
  });

  return <TechnicianQueueClient jobs={jobs} technicianId={session.user.id} />;
}
