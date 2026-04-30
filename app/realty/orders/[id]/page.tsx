import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import OrderDetailClient from './OrderDetailClient';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'REALTY') {
    redirect('/login');
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      property: true,
      customer: true,
      technician: true,
      company: true,
    }
  });

  if (!order || !order.property || order.property.ownerId !== session.user.id) {
    redirect('/realty/properties');
  }

  const serializedOrder = {
    ...order,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    assignedAt: order.assignedAt?.toISOString() || null,
    preferredDate: order.preferredDate?.toISOString() || null,
    property: {
      ...order.property,
      createdAt: order.property.createdAt.toISOString(),
      updatedAt: order.property.updatedAt.toISOString(),
    }
  };

  return <OrderDetailClient order={serializedOrder} />;
}
