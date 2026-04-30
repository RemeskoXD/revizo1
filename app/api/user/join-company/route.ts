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
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`join-co:${session.user.id}`, 20, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ companyCode?: string }>(req, 4096);
    const companyCode = body.companyCode != null ? String(body.companyCode).trim().slice(0, 80) : '';

    if (!companyCode) {
      return NextResponse.json({ message: 'Kód firmy je povinný' }, { status: 400 });
    }

    const company = await prisma.user.findFirst({
      where: {
        role: 'COMPANY_ADMIN',
        OR: [{ inviteCode: companyCode }, { id: companyCode }],
      },
    });

    if (!company) {
      return NextResponse.json({ message: 'Firma s tímto kódem nebyla nalezena' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { companyId: company.id },
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Join company error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
