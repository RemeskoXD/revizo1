import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OrderDetailClient from './OrderDetailClient';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return notFound();
  }

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      technician: { select: { name: true, email: true, phone: true } },
      company: { select: { name: true, email: true, phone: true } },
      property: { select: { ownerId: true } },
    }
  });

  if (!order) {
    return notFound();
  }

  const isCustomer = order.customerId === session.user.id;
  const isAssignedTech = order.technicianId === session.user.id;
  const isAssignedCompany = order.companyId === session.user.id;
  const isAdmin = ['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role);
  const isPublic = order.isPublic && (session.user.role === 'TECHNICIAN' || session.user.role === 'COMPANY_ADMIN');
  const isPropertyOwner = order.property?.ownerId === session.user.id;
  
  let isCompanyTechOrder = false;
  if (session.user.role === 'COMPANY_ADMIN' && order.technicianId) {
    const tech = await prisma.user.findUnique({ where: { id: order.technicianId } });
    if (tech && tech.companyId === session.user.id) {
      isCompanyTechOrder = true;
    }
  }

  if (!isCustomer && !isAssignedTech && !isAssignedCompany && !isAdmin && !isPublic && !isCompanyTechOrder && !isPropertyOwner) {
    return notFound();
  }

  let technicians: any[] = [];
  if (session.user.role === 'COMPANY_ADMIN') {
    technicians = await prisma.user.findMany({
      where: { companyId: session.user.id, role: 'TECHNICIAN' },
      select: { id: true, name: true, email: true }
    });
  }

  return <OrderDetailClient order={order} currentUser={session.user} technicians={technicians} />;
}
