import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ProfileClient from './ProfileClient';

export default async function TechnicianProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'TECHNICIAN') {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      company: true,
    }
  });

  if (!user) {
    redirect('/login');
  }

  return <ProfileClient user={user} />;
}
