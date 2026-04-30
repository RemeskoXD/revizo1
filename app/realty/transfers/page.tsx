import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TransfersClient from './TransfersClient';

export default async function TransfersPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'REALTY') {
    redirect('/login');
  }

  const claimedProperties = await prisma.property.findMany({
    where: { 
      ownerId: session.user.id,
      transferStatus: 'CLAIMED'
    },
    include: {
      claimedBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { updatedAt: 'desc' },
  });

  const serializedProperties = claimedProperties.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return <TransfersClient initialProperties={serializedProperties} />;
}
