import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import TechInvoicesClient from './TechInvoicesClient';

export default async function CompanyTechInvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COMPANY_ADMIN') redirect('/login');

  const requests = await prisma.payoutRequest.findMany({
    where: {
      technician: { companyId: session.user.id }
    },
    include: {
      technician: { select: { id: true, name: true, email: true, phone: true } },
      order: {
        select: { id: true, readableId: true, customer: { select: { name: true } } }
      }
    },
    orderBy: { createdAt: 'desc' },
  });

  return <TechInvoicesClient requests={requests} />;
}
