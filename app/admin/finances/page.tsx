import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import FinancesClient from './FinancesClient';
import { prisma } from '@/lib/prisma';

export default async function FinancesPage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role || '')) {
    redirect('/admin');
  }

  return <FinancesClient />;
}
