import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import AdminReferralsClient from './AdminReferralsClient';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Referral odměny | Admin',
  robots: { index: false, follow: false },
};

export default async function AdminReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.role !== 'ADMIN' && session.user.role !== 'SUPPORT') {
    redirect('/admin');
  }

  return <AdminReferralsClient canEdit={session.user.role === 'ADMIN'} />;
}
