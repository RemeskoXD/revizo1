/**
 * Referral program pro makléře (REALTY / PRODUCT_MANAGER).
 * Viz docs/pricing-rules.md sekce 4b.
 *
 *  - Makléř má `inviteCode` (existující pole na User – `@unique`).
 *  - Zákazník se registruje přes URL `?ref=<inviteCode>` nebo `?invite=<inviteCode>` na `/register`.
 *  - Při registraci se na novém uživateli nastaví `referredByRealtorId`.
 *  - Po **první úspěšné platbě** zákazníka (Stripe webhook) se vytvoří ReferralReward 20 Kč.
 *  - Pokud reward už existuje (UNIQUE realtorId+customerId), zápis se přeskočí.
 */

import { prisma } from '@/lib/prisma';
import { ROLES } from '@/lib/constants';
import { sendMail } from '@/lib/mail';
import { referralRewardCreatedEmail } from '@/lib/email-templates';
import { notifyReferralRewardCreated } from '@/lib/notifications';

export const REFERRAL_REWARD_CZK = 20;

export type RealtorLookup = {
  id: string;
  inviteCode: string | null;
  role: string;
} | null;

/**
 * Najde makléře podle invite kódu. Akceptuje role REALTY a PRODUCT_MANAGER.
 */
export async function findRealtorByInviteCode(code: string): Promise<RealtorLookup> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const u = await prisma.user.findUnique({
    where: { inviteCode: trimmed },
    select: { id: true, inviteCode: true, role: true },
  });
  if (!u) return null;
  if (u.role !== ROLES.REALTY && u.role !== ROLES.PRODUCT_MANAGER && u.role !== ROLES.TECHNICIAN) return null;
  return u;
}

/**
 * Spustí (pokud lze) referral reward pro zákazníka po jeho první úspěšné platbě.
 * Bezpečné volat opakovaně – díky UNIQUE constraint dojde jen k jednomu zápisu.
 *
 * Návratová hodnota:
 *   - 'CREATED'   = reward vytvořen poprvé
 *   - 'EXISTS'    = už existuje (idempotentní call)
 *   - 'NO_REF'    = uživatel nemá referredByRealtorId
 *   - 'NOT_CUSTOMER' = pouze pro role CUSTOMER
 */
export async function tryCreateReferralReward(customerId: string): Promise<
  'CREATED' | 'EXISTS' | 'NO_REF' | 'NOT_CUSTOMER'
> {
  const customer = await prisma.user.findUnique({
    where: { id: customerId },
    select: { id: true, role: true, referredByRealtorId: true },
  });
  if (!customer) return 'NOT_CUSTOMER';
  if (customer.role !== ROLES.CUSTOMER) return 'NOT_CUSTOMER';
  if (!customer.referredByRealtorId) return 'NO_REF';

  const year = new Date().getFullYear();
  const sourceLabel = `REF_LINK_${year}`;

  try {
    await prisma.referralReward.create({
      data: {
        realtorId: customer.referredByRealtorId,
        customerId: customer.id,
        amountCzk: REFERRAL_REWARD_CZK,
        status: 'PENDING',
        source: sourceLabel,
      },
    });

    // Notifikace + e-mail makléři (asynchronně, nečekáme).
    notifyReferralRewardCreated({
      realtorId: customer.referredByRealtorId,
      amountCzk: REFERRAL_REWARD_CZK,
      customerName: null, // doplníme z DB níže
    }).catch((e) => console.error('Notify referral reward failed:', e));

    void (async () => {
      try {
        const [realtor, customerFull] = await Promise.all([
          prisma.user.findUnique({
            where: { id: customer.referredByRealtorId! },
            select: { name: true, email: true, emailNotifications: true },
          }),
          prisma.user.findUnique({
            where: { id: customer.id },
            select: { name: true },
          }),
        ]);
        if (realtor?.email && realtor.emailNotifications) {
          const tpl = referralRewardCreatedEmail({
            realtorName: realtor.name,
            customerName: customerFull?.name ?? null,
            amountCzk: REFERRAL_REWARD_CZK,
          });
          await sendMail({ to: realtor.email, ...tpl });
        }
      } catch (e) {
        console.error('Send referral email failed:', e);
      }
    })();

    return 'CREATED';
  } catch (e: any) {
    // Unique constraint violation = už existuje.
    if (e?.code === 'P2002') return 'EXISTS';
    throw e;
  }
}

/**
 * Souhrn makléře – kolik celkem získal a kolik je v jednotlivých stavech.
 */
export async function getRealtorRewardSummary(realtorId: string) {
  const rows = await prisma.referralReward.groupBy({
    by: ['status'],
    where: { realtorId },
    _sum: { amountCzk: true },
    _count: { _all: true },
  });

  const summary = {
    pendingCzk: 0,
    pendingCount: 0,
    paidCzk: 0,
    paidCount: 0,
    cancelledCount: 0,
    totalCzk: 0,
    totalCount: 0,
  };

  for (const row of rows) {
    const amt = row._sum.amountCzk ?? 0;
    const cnt = row._count._all;
    summary.totalCount += cnt;
    summary.totalCzk += amt;
    if (row.status === 'PENDING') {
      summary.pendingCount = cnt;
      summary.pendingCzk = amt;
    } else if (row.status === 'PAID') {
      summary.paidCount = cnt;
      summary.paidCzk = amt;
    } else if (row.status === 'CANCELLED') {
      summary.cancelledCount = cnt;
    }
  }
  return summary;
}
