import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AccountDeletionsClient from './AccountDeletionsClient';

export default async function AdminAccountDeletionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');
  if (!['ADMIN', 'SUPPORT'].includes(session.user.role || '')) redirect('/admin');

  const rows = await prisma.accountDeletionRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const serialized = rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    user: { ...r.user, createdAt: r.user.createdAt.toISOString() },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Žádosti o smazání účtu</h1>
        <p className="text-gray-400 text-sm mt-1">
          Po schválení je uživateli nastaveno stav účtu „smazání“ a nemůže se přihlásit.
        </p>
      </div>
      <AccountDeletionsClient initial={serialized as any} />
    </div>
  );
}
