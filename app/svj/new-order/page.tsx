import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SVJNewOrderClient from './SVJNewOrderClient';

export default async function SVJNewOrderPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    select: { id: true, name: true, address: true },
    orderBy: { name: 'asc' },
  });

  const serializedBuildings = properties.map(p => ({
    id: p.id,
    name: p.name,
    address: p.address,
  }));

  return <SVJNewOrderClient buildings={serializedBuildings} />;
}
