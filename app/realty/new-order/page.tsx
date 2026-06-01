import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RealtyNewOrderClient from './RealtyNewOrderClient';

export default async function RealtyNewOrderPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'REALTY') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  });

  const serializedProperties = properties.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address,
  }));

  return <RealtyNewOrderClient properties={serializedProperties} />;
}
