import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import BuildingDetailClient from './BuildingDetailClient';

export default async function BuildingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      orders: {
        include: { revisionCategory: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!property || property.ownerId !== session.user.id) {
    redirect('/svj/buildings');
  }

  const now = new Date();

  const serializedOrders = property.orders.map(o => {
    let daysLeft: number | null = null;
    let revisionStatus: string = 'active';

    if (o.status === 'COMPLETED') {
      const months = o.revisionCategory?.intervalMonths || 36;
      const completedDate = o.completedAt || o.updatedAt;
      const expires = new Date(completedDate);
      expires.setMonth(expires.getMonth() + months);
      daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      revisionStatus = daysLeft <= 0 ? 'expired' : daysLeft <= 90 ? 'warning' : 'ok';
    }

    return {
      id: o.id,
      readableId: o.readableId,
      serviceType: o.serviceType,
      propertyType: o.propertyType,
      status: o.status,
      address: o.address,
      notes: o.notes,
      preferredDate: o.preferredDate?.toISOString() || null,
      scheduledDate: o.scheduledDate?.toISOString() || null,
      completedAt: o.completedAt?.toISOString() || null,
      createdAt: o.createdAt.toISOString(),
      categoryName: o.revisionCategory?.name || null,
      intervalMonths: o.revisionCategory?.intervalMonths || null,
      daysLeft,
      revisionStatus,
    };
  });

  const serializedProperty = {
    id: property.id,
    name: property.name,
    address: property.address,
    description: property.description,
    createdAt: property.createdAt.toISOString(),
  };

  return <BuildingDetailClient building={serializedProperty} orders={serializedOrders} />;
}
