import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Activity } from 'lucide-react';
import AdminHistoryClient from './AdminHistoryClient';

export default async function AdminHistoryPage() {
  const session = await getServerSession(authOptions);

  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
    redirect('/login');
  }

  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Historie aktivit</h1>
          <p className="text-gray-400">Posledních 100 akcí v systému.</p>
        </div>
      </div>

      <AdminHistoryClient logs={logs} />
    </div>
  );
}
