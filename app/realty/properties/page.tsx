import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import PropertiesClient from './PropertiesClient';

export default async function PropertiesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'REALTY') {
    redirect('/login');
  }

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    include: {
      orders: true,
      claimedBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  // Convert dates to strings for client component
  const serializedProperties = properties.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    orders: p.orders.map(o => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      assignedAt: o.assignedAt?.toISOString() || null,
      preferredDate: o.preferredDate?.toISOString() || null,
    })),
  }));

  return <PropertiesClient initialProperties={serializedProperties} />;
}
