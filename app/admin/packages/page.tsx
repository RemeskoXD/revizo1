import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminPackagesClient from './AdminPackagesClient';

export const metadata = {
  title: 'Revizone - Administrace Balíčků / Tlačítek',
};

export default async function AdminPackagesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { email: session.user.email },
  });

  if (!user || user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const initialPackages = await prisma.servicePackage.findMany({
    orderBy: { orderIndex: 'asc' },
  });

  return (
    <div className="p-6 h-full overflow-y-auto w-full">
      <AdminPackagesClient initialPackages={initialPackages} />
    </div>
  );
}
