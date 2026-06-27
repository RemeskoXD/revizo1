import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import InvoicesClient from './InvoicesClient';

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'TECHNICIAN' && session.user.role !== 'COMPANY_ADMIN')) {
    redirect('/login');
  }

  const invoices = await prisma.order.findMany({
    where: {
      technicianId: session.user.id,
      status: 'COMPLETED',
      invoiceFile: { not: null }
    },
    select: {
      id: true,
      readableId: true,
      serviceType: true,
      price: true,
      invoiceFile: true,
      invoiceDueDate: true,
      invoiceStatus: true,
      completedAt: true,
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
          address: true
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  const technician = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { bankAccount: true }
  });

  return <InvoicesClient invoices={invoices} technician={technician} />;
}
