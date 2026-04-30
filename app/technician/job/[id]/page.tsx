import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import JobDetailClient from './JobDetailClient';

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login');

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      customer: true,
      technician: true,
      revisionCategory: true,
    },
  });

  if (!order) notFound();
  if (order.technicianId !== session.user.id && !order.isPublic) redirect('/technician/queue');

  const addressHistory = await prisma.order.findMany({
    where: {
      address: order.address,
      status: 'COMPLETED',
      id: { not: order.id },
    },
    orderBy: { completedAt: 'desc' },
    take: 5,
    select: {
      id: true,
      readableId: true,
      serviceType: true,
      completedAt: true,
      revisionResult: true,
      revisionNotes: true,
      technician: { select: { name: true } },
    },
  });

  return <JobDetailClient order={order} currentUser={session.user} addressHistory={addressHistory} />;
}
