import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ReportFormClient from './ReportFormClient';

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) redirect('/login');

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { readableId: id },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      technician: { select: { name: true, phone: true } },
    },
  });

  if (!order || (order.technicianId !== session.user.id && order.companyId !== session.user.id)) {
    redirect('/technician/queue');
  }

  return (
    <ReportFormClient
      order={{
        readableId: order.readableId,
        serviceType: order.serviceType,
        propertyType: order.propertyType,
        address: order.confirmedAddress || order.address,
        customerName: order.customer?.name || '',
        customerPhone: order.customer?.phone || '',
        customerEmail: order.customer?.email || '',
        technicianName: order.technician?.name || session.user.name || '',
        technicianPhone: order.technician?.phone || '',
        notes: order.notes,
      }}
    />
  );
}
