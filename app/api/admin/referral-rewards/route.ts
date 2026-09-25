import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody } from '@/lib/json-body';
import { REFERRAL_REWARD_CZK } from '@/lib/referral';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

/**
 * Admin: seznam všech referral odměn s filtrem podle stavu a fulltextem (email zákazníka / makléře).
 *
 * Query params:
 *   - status: PENDING | PAID | CANCELLED | all
 *   - q: částečný e-mail / jméno
 *   - limit (default 100, max 500)
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const q = url.searchParams.get('q')?.trim().slice(0, 120) || '';
  const limit = Math.min(500, Math.max(10, parseInt(url.searchParams.get('limit') || '100', 10)));

  const where: any = {};
  if (status && (status === 'PENDING' || status === 'PAID' || status === 'CANCELLED')) {
    where.status = status;
  }
  if (q) {
    where.OR = [
      { customer: { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }, { address: { contains: q } }] } },
      { realtor: { OR: [{ email: { contains: q } }, { name: { contains: q } }, { phone: { contains: q } }] } },
      { notes: { contains: q } },
      { id: { contains: q } },
    ];
  }

  const [rows, summary] = await Promise.all([
    prisma.referralReward.findMany({
      where,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        amountCzk: true,
        status: true,
        createdAt: true,
        paidAt: true,
        notes: true,
        realtor: { select: { id: true, name: true, email: true } },
        customer: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.referralReward.groupBy({
      by: ['status'],
      _sum: { amountCzk: true },
      _count: { _all: true },
    }),
  ]);

  const totals = {
    pendingCzk: 0,
    pendingCount: 0,
    paidCzk: 0,
    paidCount: 0,
    cancelledCount: 0,
  };
  for (const r of summary) {
    if (r.status === 'PENDING') {
      totals.pendingCzk = r._sum.amountCzk ?? 0;
      totals.pendingCount = r._count._all;
    } else if (r.status === 'PAID') {
      totals.paidCzk = r._sum.amountCzk ?? 0;
      totals.paidCount = r._count._all;
    } else if (r.status === 'CANCELLED') {
      totals.cancelledCount = r._count._all;
    }
  }

  return NextResponse.json({
    rewards: rows.map((r) => ({
      id: r.id,
      amountCzk: r.amountCzk,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      paidAt: r.paidAt ? r.paidAt.toISOString() : null,
      notes: r.notes,
      realtor: r.realtor,
      customer: r.customer,
    })),
    totals,
  });
}

/**
 * Admin: ručně vytvoří odměnu (např. když zákazník nepřišel přes ?ref= URL,
 * ale makléř jej přesto přivedl jinou cestou).
 *
 * Body:
 *   - realtorId nebo realtorEmail
 *   - customerId nebo customerEmail
 *   - amountCzk?: number (default REFERRAL_REWARD_CZK)
 *   - notes?: string
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const body = await readJsonBody<{
    realtorId?: unknown;
    realtorEmail?: unknown;
    customerId?: unknown;
    customerEmail?: unknown;
    amountCzk?: unknown;
    notes?: unknown;
  }>(req, 4096).catch(() => ({} as Record<string, unknown>));

  const realtor = await findUserByIdOrEmail(body.realtorId, body.realtorEmail);
  if (!realtor) {
    return NextResponse.json(
      { message: 'Makléř nenalezen (předejte realtorId nebo realtorEmail).' },
      { status: 400 },
    );
  }
  if (realtor.role !== ROLES.REALTY && realtor.role !== ROLES.PRODUCT_MANAGER) {
    return NextResponse.json(
      { message: `Uživatel ${realtor.email} není makléř (role ${realtor.role}).` },
      { status: 400 },
    );
  }

  const customer = await findUserByIdOrEmail(body.customerId, body.customerEmail);
  if (!customer) {
    return NextResponse.json(
      { message: 'Zákazník nenalezen (předejte customerId nebo customerEmail).' },
      { status: 400 },
    );
  }
  if (customer.role !== ROLES.CUSTOMER) {
    return NextResponse.json(
      { message: `Uživatel ${customer.email} není zákazník (role ${customer.role}).` },
      { status: 400 },
    );
  }

  const amountRaw = Number(body.amountCzk);
  const amountCzk =
    Number.isFinite(amountRaw) && amountRaw >= 0 && amountRaw <= 100000
      ? Math.floor(amountRaw)
      : REFERRAL_REWARD_CZK;

  const notes =
    typeof body.notes === 'string'
      ? body.notes.trim().slice(0, 2000)
      : 'Vytvořeno administrátorem';

  try {
    const created = await prisma.referralReward.create({
      data: {
        realtorId: realtor.id,
        customerId: customer.id,
        amountCzk,
        status: 'PENDING',
        notes,
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATED_REFERRAL_REWARD',
        details: `realtor=${realtor.email} customer=${customer.email} amount=${amountCzk}`,
        targetId: created.id,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json(
        { message: 'Odměna pro tuto kombinaci makléř + zákazník už existuje.' },
        { status: 409 },
      );
    }
    console.error('Create manual reward error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

async function findUserByIdOrEmail(
  id: unknown,
  email: unknown,
): Promise<{ id: string; email: string | null; name: string | null; role: string } | null> {
  const idStr = typeof id === 'string' ? id.trim() : '';
  const emailStr = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (idStr) {
    const u = await prisma.user.findUnique({
      where: { id: idStr },
      select: { id: true, email: true, name: true, role: true },
    });
    if (u) return u;
  }
  if (emailStr) {
    const u = await prisma.user.findUnique({
      where: { email: emailStr },
      select: { id: true, email: true, name: true, role: true },
    });
    if (u) return u;
  }
  return null;
}
