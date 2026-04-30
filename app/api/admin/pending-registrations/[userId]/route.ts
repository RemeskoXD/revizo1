import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { sendMail } from '@/lib/mail';
import { registrationApprovedEmail, registrationRejectedEmail } from '@/lib/email-templates';
import { parseRevisionAuthValidUntilDate } from '@/lib/revision-auth-core';
import { updateUserWithSubscriptionColumnFallback } from '@/lib/prisma-subscription-column';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const body = await readJsonBody<{ action?: string; revisionAuthValidUntil?: string | null }>(req, 4096);
    const action = body.action === 'approve' ? 'approve' : body.action === 'reject' ? 'reject' : null;
    if (!action) {
      return NextResponse.json({ message: 'action: approve | reject' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.accountStatus !== 'PENDING_APPROVAL') {
      return NextResponse.json({ message: 'Účet nenalezen nebo není ke schválení' }, { status: 404 });
    }

    if (!['TECHNICIAN', 'COMPANY_ADMIN'].includes(user.role)) {
      return NextResponse.json({ message: 'Neplatná role' }, { status: 400 });
    }

    if (action === 'approve') {
      const raw = body.revisionAuthValidUntil;
      if (typeof raw !== 'string' || !String(raw).trim()) {
        return NextResponse.json(
          { message: 'U schválení zadejte platnost oprávnění k revizím (datum do).' },
          { status: 400 }
        );
      }
    }

    if (action === 'reject') {
      await prisma.user.update({
        where: { id: user.id },
        data: { accountStatus: 'REJECTED' },
      });

      if (user.email) {
        const emailData = registrationRejectedEmail({ name: user.name });
        await sendMail({
          to: user.email,
          ...emailData,
          meta: { type: 'REGISTRATION_REJECTED', userId: user.id },
        });
      }

      return NextResponse.json({ ok: true, status: 'REJECTED' });
    }

    let companyId: string | null = null;
    if (user.pendingCompanyInviteCode) {
      const parent = await prisma.user.findFirst({
        where: {
          role: 'COMPANY_ADMIN',
          inviteCode: user.pendingCompanyInviteCode,
        },
        select: { id: true },
      });
      if (parent && user.role === 'TECHNICIAN') {
        companyId = parent.id;
      }
    }

    const newInviteCode =
      user.role === 'COMPANY_ADMIN' && !user.inviteCode
        ? randomBytes(5).toString('hex').slice(0, 10).toUpperCase()
        : undefined;

    const untilParsed = parseRevisionAuthValidUntilDate(String(body.revisionAuthValidUntil).trim());
    if (!untilParsed) {
      return NextResponse.json({ message: 'Neplatné datum platnosti oprávnění.' }, { status: 400 });
    }

    await updateUserWithSubscriptionColumnFallback({
      where: { id: user.id },
      data: {
        accountStatus: 'ACTIVE',
        pendingCompanyInviteCode: null,
        revisionAuthValidUntil: untilParsed,
        ...(newInviteCode ? { inviteCode: newInviteCode } : {}),
        ...(companyId ? { companyId } : {}),
      },
    });

    const roleLabel = user.role === 'TECHNICIAN' ? 'technik' : 'firma (správce)';
    const validUntilLabel = untilParsed.toLocaleDateString('cs-CZ');
    if (user.email) {
      const emailData = registrationApprovedEmail({ name: user.name, roleLabel, validUntilLabel });
      await sendMail({
        to: user.email,
        ...emailData,
        meta: { type: 'REGISTRATION_APPROVED', userId: user.id },
      });
    }

    return NextResponse.json({ ok: true, status: 'ACTIVE' });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('pending-registrations POST', error);
    return NextResponse.json({ message: 'Chyba' }, { status: 500 });
  }
}
