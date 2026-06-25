import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AdminSupportClient } from '@/components/support/SupportTicketsClient';

export default async function AdminSupportPage() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT' && session.user.role !== 'SUPER_ADMIN')) {
    redirect('/login');
  }

  const tickets = await prisma.supportTicket.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, role: true } }
    },
    orderBy: { createdAt: 'desc' },
  });

  return <AdminSupportClient tickets={tickets} currentUser={session.user} />;
}
