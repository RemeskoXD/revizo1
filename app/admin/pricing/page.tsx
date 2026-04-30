import AdminPricingClient from './AdminPricingClient';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function AdminPricingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || user.role !== 'ADMIN') {
    // Only real admins should access pricing settings
    redirect('/dashboard');
  }

  return <AdminPricingClient />;
}
