import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`profile:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho úprav profilu. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      emailNotifications?: boolean;
    }>(req, 16_384);

    const first = body.firstName != null ? String(body.firstName).trim().slice(0, 80) : '';
    const last = body.lastName != null ? String(body.lastName).trim().slice(0, 80) : '';
    const phone = body.phone != null ? String(body.phone).trim().slice(0, 40) : undefined;

    const name = `${first} ${last}`.trim();
    if (name.length < 2) {
      return NextResponse.json({ message: 'Jméno je příliš krátké' }, { status: 400 });
    }

    const data: { name: string; phone?: string; emailNotifications?: boolean } = { name, phone };
    if (typeof body.emailNotifications === 'boolean') {
      data.emailNotifications = body.emailNotifications;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
