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
    take: 100,
    orderBy: { createdAt: 'desc' },
    where: {
      accountStatus: 'PENDING_APPROVAL',
    },
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

  const categories = await prisma.revisionCategory.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, group: true }
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Registrace ke schválení</h1>
        <p className="text-gray-400 mt-1">
          Technici a firmy s nahraným oprávněním. Po schválení nebo zamítnutí přijde uživateli e-mail.
        </p>
      </div>

      <PendingRegistrationsClient initialRows={initialRows} categories={categories} />
    </div>
  );
}
