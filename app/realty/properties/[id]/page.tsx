import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PropertyDetailClient from './PropertyDetailClient';

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'REALTY') {
    redirect('/login');
  }

  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!property || property.ownerId !== session.user.id) {
    redirect('/realty/properties');
  }

  const serializedProperty = {
    ...property,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    orders: property.orders.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      assignedAt: o.assignedAt?.toISOString() || null,
      preferredDate: o.preferredDate?.toISOString() || null,
    })),
  };

  return <PropertyDetailClient property={serializedProperty} />;
}
