import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import RevisionsClient from './RevisionsClient';

export default async function SVJRevisionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'SVJ') redirect('/login');

  const properties = await prisma.property.findMany({
    where: { ownerId: session.user.id },
    include: {
      orders: {
        where: { status: 'COMPLETED' },
        include: { revisionCategory: true },
        orderBy: { completedAt: 'desc' },
      },
    },
  });

  const now = new Date();

  const revisions = properties.flatMap(p =>
    p.orders.map(o => {
      const months = o.revisionCategory?.intervalMonths || 36;
      const completedDate = o.completedAt || o.updatedAt;
      const expires = new Date(completedDate);
      expires.setMonth(expires.getMonth() + months);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: o.id,
        readableId: o.readableId,
        serviceType: o.serviceType,
        address: o.address,
        buildingName: p.name,
        buildingId: p.id,
        categoryName: o.revisionCategory?.name || null,
        intervalMonths: o.revisionCategory?.intervalMonths || 36,
        completedAt: completedDate.toISOString(),
        expiresAt: expires.toISOString(),
        daysLeft,
        hasReport: !!o.reportFile,
        result: o.revisionResult,
        status: daysLeft <= 0 ? 'expired' as const : daysLeft <= 90 ? 'warning' as const : daysLeft <= 180 ? 'soon' as const : 'ok' as const,
      };
    })
  ).sort((a, b) => a.daysLeft - b.daysLeft);

  return <RevisionsClient revisions={revisions} />;
}
