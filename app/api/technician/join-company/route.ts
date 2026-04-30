import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'TECHNICIAN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`tech-join:${session.user.id}`, 25, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Příliš mnoho žádostí. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ inviteCode?: string }>(req, 4096);
    const inviteCode = body.inviteCode != null ? String(body.inviteCode).trim().slice(0, 32) : '';

    if (!inviteCode) {
      return NextResponse.json({ error: 'Invite code is required' }, { status: 400 });
    }

    const company = await prisma.user.findUnique({
      where: { inviteCode },
    });

    if (!company || company.role !== 'COMPANY_ADMIN') {
      return NextResponse.json({ error: 'Neplatný kód firmy' }, { status: 404 });
    }

    const existingRequest = await prisma.companyJoinRequest.findUnique({
      where: {
        technicianId_companyId: {
          technicianId: session.user.id,
          companyId: company.id,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return NextResponse.json({ error: 'Žádost již byla odeslána a čeká na schválení' }, { status: 400 });
      } else if (existingRequest.status === 'APPROVED') {
        return NextResponse.json({ error: 'Již jste členem této firmy' }, { status: 400 });
      } else {
        await prisma.companyJoinRequest.update({
          where: { id: existingRequest.id },
          data: { status: 'PENDING' },
        });
        return NextResponse.json({ success: true });
      }
    }

    await prisma.companyJoinRequest.create({
      data: {
        technicianId: session.user.id,
        companyId: company.id,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Join company error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
