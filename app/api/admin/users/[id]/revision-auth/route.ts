import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseRevisionAuthValidUntilDate } from '@/lib/revision-auth-core';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';

/** Úprava platnosti oprávnění k revizím (technik / firma) – pouze ADMIN. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await readJsonBody<{ revisionAuthValidUntil?: string | null }>(req, 256);

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true },
    });

    if (!target || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(target.role)) {
      return NextResponse.json({ message: 'Uživatel nenalezen nebo role nepodporuje oprávnění revizí.' }, { status: 400 });
    }

    let until: Date | null = null;
    if (body.revisionAuthValidUntil === null || body.revisionAuthValidUntil === '') {
      until = null;
    } else if (typeof body.revisionAuthValidUntil === 'string') {
      const parsed = parseRevisionAuthValidUntilDate(body.revisionAuthValidUntil.trim());
      if (!parsed) {
        return NextResponse.json({ message: 'Neplatné datum (očekává se YYYY-MM-DD).' }, { status: 400 });
      }
      until = parsed;
    } else {
      return NextResponse.json({ message: 'Chybí revisionAuthValidUntil' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { revisionAuthValidUntil: until },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATED_REVISION_AUTH',
        details: until
          ? `Platnost oprávnění k revizím pro ${target.email}: ${until.toISOString()}`
          : `Platnost oprávnění k revizím pro ${target.email}: zrušena (bez omezení)`,
        targetId: id,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('revision-auth PATCH', error);
    return NextResponse.json({ message: 'Chyba' }, { status: 500 });
  }
}
