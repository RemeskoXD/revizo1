import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminPayoutsClient from './AdminPayoutsClient';

export default async function AdminPayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) redirect('/login');

  const requests = await prisma.payoutRequest.findMany({
    take: 100,
    orderBy: { requestedAt: 'desc' },
    include: {
      technician: { select: { id: true, name: true, email: true, phone: true } },
      order: {
        select: { id: true, readableId: true, customer: { select: { name: true } } }
      }
    }
  });

  return <AdminPayoutsClient requests={requests} />;
}
