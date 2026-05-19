import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'node:crypto';
import { getRealtorRewardSummary, REFERRAL_REWARD_CZK } from '@/lib/referral';
import { getAppBaseUrl } from '@/lib/stripe-config';
import { REALTY_TRANSFER_FEE_CZK, REALTY_TRANSFER_REBATE_CZK } from '@/lib/subscription-pricing';
import RealtyReferralsClient from './RealtyReferralsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Doporučení | Revizone',
  robots: { index: false, follow: false },
};

async function ensureInviteCode(userId: string, existing: string | null): Promise<string> {
  if (existing && existing.length >= 6) return existing;
  // Generování unikátního invite kódu (10 hex znaků, uppercase).
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = randomBytes(5).toString('hex').slice(0, 10).toUpperCase();
    try {
      const u = await prisma.user.update({ where: { id: userId }, data: { inviteCode: code } });
      return u.inviteCode!;
    } catch (e: any) {
      if (e?.code === 'P2002') continue;
      throw e;
    }
  }
  throw new Error('Cannot generate unique invite code');
}

export default async function RealtyReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'REALTY') redirect('/login');

  const realtor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, inviteCode: true },
  });
  if (!realtor) redirect('/login');

  const inviteCode = await ensureInviteCode(realtor.id, realtor.inviteCode);
  const summary = await getRealtorRewardSummary(realtor.id);

  const rewards = await prisma.referralReward.findMany({
    where: { realtorId: realtor.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      amountCzk: true,
      status: true,
      createdAt: true,
      paidAt: true,
      customer: { select: { id: true, name: true, email: true, createdAt: true } },
    },
  });

  const referredCustomers = await prisma.user.findMany({
    where: { referredByRealtorId: realtor.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      licenseValidUntil: true,
    },
  });

  const transferFees = await prisma.realtorTransferFee.findMany({
    where: { realtorId: realtor.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      property: { select: { id: true, name: true, address: true } },
      customer: { select: { id: true, name: true, email: true } },
    },
  });

  const link = `${getAppBaseUrl()}/register?ref=${encodeURIComponent(inviteCode)}`;

  return (
    <RealtyReferralsClient
      inviteCode={inviteCode}
      referralLink={link}
      rewardCzk={REFERRAL_REWARD_CZK}
      transferFeeCzk={REALTY_TRANSFER_FEE_CZK}
      transferRebateCzk={REALTY_TRANSFER_REBATE_CZK}
      summary={summary}
      rewards={rewards.map((r) => ({
        id: r.id,
        amountCzk: r.amountCzk,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        paidAt: r.paidAt ? r.paidAt.toISOString() : null,
        customer: {
          id: r.customer.id,
          name: r.customer.name,
          email: r.customer.email,
          registeredAt: r.customer.createdAt.toISOString(),
        },
      }))}
      referredCustomers={referredCustomers.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        registeredAt: c.createdAt.toISOString(),
        hasActiveLicense: c.licenseValidUntil ? c.licenseValidUntil.getTime() > Date.now() : false,
      }))}
      transferFees={transferFees.map((tf) => ({
        id: tf.id,
        amountCzk: tf.amountCzk,
        status: tf.status,
        createdAt: tf.createdAt.toISOString(),
        paidAt: tf.paidAt ? tf.paidAt.toISOString() : null,
        property: { id: tf.property.id, name: tf.property.name, address: tf.property.address },
        customer: { id: tf.customer.id, name: tf.customer.name, email: tf.customer.email },
      }))}
    />
  );
}
