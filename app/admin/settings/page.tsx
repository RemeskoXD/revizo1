import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import AdminSettingsClient from './AdminSettingsClient';

export default async function AdminSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });

  const teamMembers = await prisma.user.findMany({
    where: { role: { in: ['SUPPORT', 'CONTRACTOR', 'PENDING_SUPPORT', 'PENDING_CONTRACTOR'] } },
    orderBy: { createdAt: 'desc' },
  });

  let systemConfig: Record<string, string> = {};
  try {
    const configs = await prisma.systemConfig.findMany();
    for (const c of configs) {
      systemConfig[c.key] = c.value;
    }
  } catch {
    // Table might not exist yet
  }

  return <AdminSettingsClient user={user} teamMembers={teamMembers} systemConfig={systemConfig} />;
}
