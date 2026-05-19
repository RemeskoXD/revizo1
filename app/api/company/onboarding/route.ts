import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Vrátí stav onboardingu firmy:
 *  - hasInviteCode: existuje invite kód pro připojení techniků
 *  - techCount: počet připojených techniků (nebo schválených requestů)
 *  - hasObjects: má aspoň 1 evidovaný objekt (nemovitost)
 *  - techBillingActive: zaplacený měsíční billing techniků
 *
 * UI v /company dashboardu zobrazuje kroky, dokud nejsou všechny dokončené.
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (session.user.role !== ROLES.COMPANY_ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const [company, techCount, objectsCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        inviteCode: true,
        companyTechBillingActive: true,
      },
    }),
    prisma.user.count({
      where: { companyId: session.user.id, role: ROLES.TECHNICIAN, isDeleted: false },
    }),
    prisma.property.count({ where: { ownerId: session.user.id } }),
  ]);

  return NextResponse.json({
    hasInviteCode: Boolean(company?.inviteCode),
    inviteCode: company?.inviteCode || null,
    techCount,
    hasTechnicians: techCount > 0,
    hasObjects: objectsCount > 0,
    objectCount: objectsCount,
    techBillingActive: Boolean(company?.companyTechBillingActive),
  });
}
