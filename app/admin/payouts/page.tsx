import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminPayoutsClient from './AdminPayoutsClient';

export default async function AdminPayoutsPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT')) redirect('/login');

  const requests = await prisma.payoutRequest.findMany({
    include: {
      technician: { select: { id: true, name: true, email: true, phone: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  return <AdminPayoutsClient requests={requests} />;
}
