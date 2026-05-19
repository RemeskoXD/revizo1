import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import CompanyDocumentsClient from './CompanyDocumentsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dokumenty | Revizone',
};

export default async function CompanyDocumentsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!['COMPANY_ADMIN', 'SVJ'].includes(session.user.role)) {
    redirect('/login');
  }
  return <CompanyDocumentsClient />;
}
