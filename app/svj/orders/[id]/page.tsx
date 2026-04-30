import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import SVJOrderDetailClient from './SVJOrderDetailClient';

export default async function SVJOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      property: true,
      technician: { select: { id: true, name: true, email: true } },
      company: { select: { id: true, name: true, email: true } },
      revisionCategory: true,
    },
  });

  if (!order || !order.property || order.property.ownerId !== session.user.id) {
    redirect('/svj/buildings');
  }

  const serializedOrder = {
    id: order.id,
    readableId: order.readableId,
    serviceType: order.serviceType,
    propertyType: order.propertyType,
    status: order.status,
    address: order.address,
    notes: order.notes,
    price: order.price,
    revisionResult: order.revisionResult,
    revisionNotes: order.revisionNotes,
    scheduledDate: order.scheduledDate?.toISOString() || null,
    scheduledNote: order.scheduledNote,
    preferredDate: order.preferredDate?.toISOString() || null,
    completedAt: order.completedAt?.toISOString() || null,
    createdAt: order.createdAt.toISOString(),
    hasReport: !!order.reportFile,
    propertyId: order.propertyId,
    propertyName: order.property.name,
    technician: order.technician,
    company: order.company,
    categoryName: order.revisionCategory?.name || null,
    intervalMonths: order.revisionCategory?.intervalMonths || null,
  };

  return <SVJOrderDetailClient order={serializedOrder} />;
}
