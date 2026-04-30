import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RevisionsClient from './RevisionsClient';

/** Stejné role jako v middleware pro `/admin` (jinak CONTRACTOR skončí na redirect smyčce). */
const REVISIONS_PAGE_ROLES = ['ADMIN', 'SUPPORT', 'CONTRACTOR'];

export default async function RevisionsPage() {
  const session = await getServerSession(authOptions);

  if (!session || !REVISIONS_PAGE_ROLES.includes(session.user.role)) {
    redirect('/login');
  }

  const categories = await prisma.revisionCategory.findMany({
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    include: {
      _count: { select: { orders: true } },
    },
  });

  const canEdit = session.user.role === 'ADMIN' || session.user.role === 'SUPPORT';

  return <RevisionsClient categories={categories} isAdmin={canEdit} />;
}
