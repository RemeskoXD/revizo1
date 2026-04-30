import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PendingRegistrationsClient, { PendingRow } from './PendingRegistrationsClient';

export default async function AdminRegistrationsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
    redirect('/login');
  }

  const users = await prisma.user.findMany({
    where: {
      accountStatus: 'PENDING_APPROVAL',
      role: { in: ['TECHNICIAN', 'COMPANY_ADMIN'] },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      ico: true,
      expectedTechnicians: true,
      pendingCompanyInviteCode: true,
      licenseMimeType: true,
      createdAt: true,
    },
  });

  const initialRows: PendingRow[] = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Registrace ke schválení</h1>
        <p className="text-gray-400 mt-1">
          Technici a firmy s nahraným oprávněním. Po schválení nebo zamítnutí přijde uživateli e-mail.
        </p>
      </div>

      <PendingRegistrationsClient initialRows={initialRows} />
    </div>
  );
}
