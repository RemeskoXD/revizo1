import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import TechnicianDetailClient from './TechnicianDetailClient';

export default async function CompanyTechnicianDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    redirect('/login');
  }

  const { id } = await params;

  const technician = await prisma.user.findFirst({
    where: {
      id,
      companyId: session.user.id,
      role: 'TECHNICIAN'
    },
    include: {
      assignedOrders: {
        orderBy: { createdAt: 'desc' },
        include: { customer: true }
      }
    }
  });

  if (!technician) {
    notFound();
  }

  return <TechnicianDetailClient technician={technician} />;
}
