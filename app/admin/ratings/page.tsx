import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AdminRatingsClient from './AdminRatingsClient';

export default async function AdminRatingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
    redirect('/login');
  }

  const technicians = await prisma.user.findMany({
    where: { role: 'TECHNICIAN' },
    select: {
      id: true,
      name: true,
      email: true,
      technicianReviews: {
        include: {
          customer: { select: { name: true, email: true } },
          order: { select: { readableId: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  const serializedTechnicians = JSON.parse(JSON.stringify(technicians));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Hodnocení techniků</h1>
        <p className="text-gray-400">Přehled hodnocení od zákazníků podle jednotlivých techniků.</p>
      </div>

      <AdminRatingsClient technicians={serializedTechnicians} />
    </div>
  );
}
