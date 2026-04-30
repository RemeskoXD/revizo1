import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import CompanyTechniciansClient from './CompanyTechniciansClient';

export default async function CompanyTechniciansPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    redirect('/login');
  }

  const companyUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { inviteCode: true }
  });

  const technicians = await prisma.user.findMany({
    where: {
      companyId: session.user.id,
      role: 'TECHNICIAN'
    },
    include: {
      assignedOrders: {
        where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
      }
    },
    orderBy: { name: 'asc' }
  });

  const joinRequests = await prisma.companyJoinRequest.findMany({
    where: {
      companyId: session.user.id,
      status: 'PENDING'
    },
    include: {
      technician: {
        select: { id: true, name: true, email: true, phone: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return <CompanyTechniciansClient technicians={technicians} joinRequests={joinRequests} companyCode={companyUser?.inviteCode || 'Nenastaveno'} />;
}
