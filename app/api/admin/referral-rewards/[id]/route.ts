import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody } from '@/lib/json-body';
import { sendMail } from '@/lib/mail';
import { referralRewardPaidEmail } from '@/lib/email-templates';
import { notifyReferralRewardPaid } from '@/lib/notifications';

/**
 * Admin endpoint pro správu / smazání jednotlivé referral odměny.
 *
 * PATCH body: { status: 'PAID' | 'CANCELLED' | 'PENDING', notes?: string }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await readJsonBody<{ status?: unknown; notes?: unknown }>(req, 4096).catch(
    () => ({} as { status?: unknown; notes?: unknown }),
  );

  const status =
    typeof body.status === 'string' &&
    (body.status === 'PAID' || body.status === 'CANCELLED' || body.status === 'PENDING')
      ? body.status
      : null;
  if (!status) {
    return NextResponse.json({ message: 'Invalid status' }, { status: 400 });
  }

  const notes =
    typeof body.notes === 'string' ? body.notes.trim().slice(0, 2000) : undefined;

  const data: Record<string, unknown> = { status, notes };
  if (status === 'PAID') data.paidAt = new Date();
  if (status !== 'PAID') data.paidAt = null;

  try {
    const before = await prisma.referralReward.findUnique({
      where: { id },
      select: { status: true },
    });
    const updated = await prisma.referralReward.update({
      where: { id },
      data,
      include: {
        realtor: { select: { id: true, name: true, email: true, emailNotifications: true } },
      },
    });
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_REFERRAL_REWARD',
        details: `${id} → ${status}${notes ? ` · ${notes}` : ''}`,
        targetId: id,
      },
    });

    // Při změně na PAID pošli notifikaci + e-mail makléři.
    if (status === 'PAID' && before?.status !== 'PAID') {
      notifyReferralRewardPaid({
        realtorId: updated.realtor.id,
        amountCzk: updated.amountCzk,
      }).catch((e) => console.error('Notify referral paid failed:', e));

      if (updated.realtor.email && updated.realtor.emailNotifications) {
        const tpl = referralRewardPaidEmail({
          realtorName: updated.realtor.name,
          amountCzk: updated.amountCzk,
        });
        sendMail({ to: updated.realtor.email, ...tpl }).catch((e) =>
          console.error('Send referral paid email failed:', e),
        );
      }
    }

    return NextResponse.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    console.error('Update referral reward error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await prisma.referralReward.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETED_REFERRAL_REWARD',
        details: id,
        targetId: id,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ message: 'Not found' }, { status: 404 });
    }
    console.error('Delete referral reward error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
