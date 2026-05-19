import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  REALTY_TRANSFER_REBATE_CZK,
  REALTY_TRANSFER_REBATE_DAYS,
} from '@/lib/subscription-pricing';

/**
 * Denní cron pro vyhodnocení transfer rebate (20 Kč).
 * Pravidlo: Pokud uplynulo {REALTY_TRANSFER_REBATE_DAYS} dní od převodu nemovitosti
 * a customer je aktivní (má aktivní licenci `licenseValidUntil` v budoucnu),
 * vytvoří se PENDING ReferralReward 20 Kč pro makléře.
 *
 * Idempotence je zajištěna UNIQUE(realtorId, customerId, source).
 *
 * GET /api/cron/transfer-rebate?secret=...
 */
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const provided = searchParams.get('secret');

  if (process.env.NODE_ENV === 'production') {
    if (!CRON_SECRET) {
      return NextResponse.json({ message: 'CRON_SECRET není nastaven' }, { status: 503 });
    }
    if (provided !== CRON_SECRET) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
  } else if (CRON_SECRET && provided !== CRON_SECRET) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - REALTY_TRANSFER_REBATE_DAYS * 24 * 60 * 60 * 1000);

  // Najdi PAID transfery starší než cutoff, kde ještě není vytvořený rebate.
  const eligible = await prisma.realtorTransferFee.findMany({
    where: {
      status: 'PAID',
      paidAt: { lte: cutoff, not: null },
    },
    select: {
      id: true,
      realtorId: true,
      customerId: true,
      customer: { select: { licenseValidUntil: true } },
    },
  });

  let created = 0;
  let skipped = 0;
  const now = new Date();

  for (const fee of eligible) {
    const isActive =
      fee.customer.licenseValidUntil != null && fee.customer.licenseValidUntil > now;
    if (!isActive) {
      skipped += 1;
      continue;
    }
    try {
      await prisma.referralReward.create({
        data: {
          realtorId: fee.realtorId,
          customerId: fee.customerId,
          amountCzk: REALTY_TRANSFER_REBATE_CZK,
          status: 'PENDING',
          source: 'PROPERTY_TRANSFER',
          notes: `Bonus za aktivního zákazníka po ${REALTY_TRANSFER_REBATE_DAYS} dnech (transfer fee ${fee.id}).`,
        },
      });
      created += 1;
    } catch (e: any) {
      if (e?.code === 'P2002') {
        // Už existuje – idempotentní.
        skipped += 1;
      } else {
        console.error('Failed to create transfer rebate:', e);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    checked: eligible.length,
    created,
    skipped,
  });
}
