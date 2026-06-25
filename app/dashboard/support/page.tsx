import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UserSupportClient } from '@/components/support/SupportTicketsClient';

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div className="p-6">
      <UserSupportClient currentUser={session.user} />
    </div>
  );
}
