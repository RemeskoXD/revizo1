import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import {
  getCompanyTechBillingStatus,
  TECH_SEAT_MONTHLY_CZK,
  TECH_FREE_TECHS,
} from '@/lib/company-pricing';

export const dynamic = 'force-dynamic';

/**
 * Vrátí firmě stav billingu techniků (počet, billable, měsíční částka,
 * zda běží Stripe subscription).
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
  }
  if (session.user.role !== ROLES.COMPANY_ADMIN) {
    return NextResponse.json({ message: 'Pouze pro firmy' }, { status: 403 });
  }

  const [techCount, company] = await Promise.all([
    prisma.user.count({
      where: { companyId: session.user.id, role: ROLES.TECHNICIAN, isDeleted: false },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { companyTechBillingActive: true },
    }),
  ]);

  const status = getCompanyTechBillingStatus({
    techCount,
    subscriptionActive: Boolean(company?.companyTechBillingActive),
  });

  return NextResponse.json({
    ...status,
    rules: {
      seatMonthlyCzk: TECH_SEAT_MONTHLY_CZK,
      freeTechs: TECH_FREE_TECHS,
    },
  });
}
