import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import TechnicianShell from './TechnicianShell';

export default async function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== 'TECHNICIAN') {
    redirect('/login');
  }
  return <TechnicianShell>{children}</TechnicianShell>;
}
