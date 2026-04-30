import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminOrdersClient from './AdminOrdersClient';

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(session.user.role)) {
    redirect('/login');
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      technician: true,
      company: true,
    },
  });

  const technicians = await prisma.user.findMany({
    where: { role: 'TECHNICIAN' },
    select: { id: true, name: true, email: true }
  });

  const companies = await prisma.user.findMany({
    where: { role: 'COMPANY_ADMIN' },
    select: { id: true, name: true, email: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Správa objednávek</h1>
          <p className="text-gray-400">Globální přehled všech revizí v systému.</p>
        </div>
      </div>

      <AdminOrdersClient initialOrders={orders} technicians={technicians} companies={companies} userRole={session.user.role} />
    </div>
  );
}
