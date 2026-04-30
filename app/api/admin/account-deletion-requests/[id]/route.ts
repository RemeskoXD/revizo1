import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody } from '@/lib/json-body';

const ADMIN_ROLES = ['ADMIN', 'SUPPORT'];

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !ADMIN_ROLES.includes(session.user.role || '')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await ctx.params;
    const body = await readJsonBody<{ action?: string }>(req, 256);
    const action = body.action === 'approve' || body.action === 'reject' ? body.action : null;
    if (!action) {
      return NextResponse.json({ message: 'Neplatná akce.' }, { status: 400 });
    }

    const reqRow = await prisma.accountDeletionRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!reqRow || reqRow.status !== 'PENDING') {
      return NextResponse.json({ message: 'Žádost nenalezena nebo již vyřízena.' }, { status: 404 });
    }

    if (reqRow.userId === session.user.id) {
      return NextResponse.json({ message: 'Nelze schválit vlastní žádost.' }, { status: 400 });
    }

    const now = new Date();
    const adminId = session.user.id;

    if (action === 'reject') {
      await prisma.accountDeletionRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          processedAt: now,
          processedById: adminId,
        },
      });
      return NextResponse.json({ success: true });
    }

    // approve
    await prisma.$transaction([
      prisma.accountDeletionRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          processedAt: now,
          processedById: adminId,
        },
      }),
      prisma.user.update({
        where: { id: reqRow.userId },
        data: { isDeleted: true },
      }),
      prisma.activityLog.create({
        data: {
          userId: adminId,
          action: 'ACCOUNT_DELETION_APPROVED',
          details: JSON.stringify({ targetUserId: reqRow.userId, requestId: id }),
          targetId: reqRow.userId,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Chyba serveru' }, { status: 500 });
  }
}
