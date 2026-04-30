import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RoleRequestsClient from './RoleRequestsClient';

export default async function AdminRolesPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    redirect('/login');
  }

  const roleRequests = await prisma.roleRequest.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Žádosti o změnu role</h1>
        <p className="text-gray-400 mt-1">Správa žádostí uživatelů o změnu oprávnění.</p>
      </div>

      <RoleRequestsClient initialRequests={roleRequests} />
    </div>
  );
}
