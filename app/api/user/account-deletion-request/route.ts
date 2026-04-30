import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { readJsonBody } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Nejste přihlášeni.' }, { status: 401 });
    }

    const limited = rateLimit(`account-del-req:${session.user.id}`, 5, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ password?: string; note?: string }>(req, 8192);
    const password = body.password != null ? String(body.password) : '';
    const note = body.note != null ? String(body.note).slice(0, 2000) : undefined;

    if (!password) {
      return NextResponse.json({ message: 'Zadejte heslo.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || user.isDeleted) {
      return NextResponse.json({ message: 'Účet nebyl nalezen nebo je již deaktivovaný.' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json({ message: 'Účet bez hesla nelze tímto způsobem ověřit. Kontaktujte podporu.' }, { status: 400 });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json({ message: 'Nesprávné heslo.' }, { status: 401 });
    }

    const existing = await prisma.accountDeletionRequest.findFirst({
      where: { userId: user.id, status: 'PENDING' },
    });
    if (existing) {
      return NextResponse.json(
        { message: 'Již máte odeslanou čekající žádost o smazání účtu.' },
        { status: 409 }
      );
    }

    await prisma.accountDeletionRequest.create({
      data: {
        userId: user.id,
        note: note || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, message: 'Žádost byla odeslána ke schválení.' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: 'Došlo k chybě serveru.' }, { status: 500 });
  }
}
