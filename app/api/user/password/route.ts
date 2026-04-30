import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const limited = rateLimit(`pwd-change:${session.user.id}`, 10, 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho změn hesla. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ currentPassword?: string; newPassword?: string }>(req, 16_384);
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ message: 'Vyplňte všechna pole' }, { status: 400 });
    }

    if (newPassword.length < 10 || newPassword.length > 200) {
      return NextResponse.json(
        { message: 'Nové heslo musí mít 10–200 znaků' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return NextResponse.json({ message: 'Uživatel nenalezen' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ message: 'Současné heslo je nesprávné' }, { status: 401 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ message: 'Heslo bylo úspěšně změněno' });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Password change error:', error);
    return NextResponse.json({ message: 'Interní chyba serveru' }, { status: 500 });
  }
}
