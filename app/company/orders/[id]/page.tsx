import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import CompanyOrderDetailClient from './CompanyOrderDetailClient';

export default async function CompanyOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    redirect('/login');
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      customer: true,
      technician: true,
    },
  });

  if (!order) {
    notFound();
  }

  // Ensure the company is assigned to this order or it's public
  if (order.companyId !== session.user.id && !order.isPublic) {
    redirect('/company/orders');
  }

  const companyTechnicians = await prisma.user.findMany({
    where: { companyId: session.user.id, role: 'TECHNICIAN' }
  });

  return <CompanyOrderDetailClient order={order} currentUser={session.user} technicians={companyTechnicians} />;
}
