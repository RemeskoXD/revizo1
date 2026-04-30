import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import EmailsClient from './EmailsClient';

export default async function AdminEmailsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) redirect('/login');

  return <EmailsClient />;
}
