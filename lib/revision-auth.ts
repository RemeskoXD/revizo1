import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isRevisionAuthExpired } from '@/lib/revision-auth-core';

export {
  parseRevisionAuthValidUntilDate,
  isRevisionAuthExpired,
  isRevisionAuthRole,
} from '@/lib/revision-auth-core';

/** Vrátí 403 nebo null; používejte u operací technika/firmy po ověření session. */
export async function assertRevisionAuthValid(userId: string): Promise<NextResponse | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, revisionAuthValidUntil: true },
  });
  if (!u) return NextResponse.json({ message: 'Neautorizováno' }, { status: 401 });
  if (isRevisionAuthExpired(u.role, u.revisionAuthValidUntil)) {
    return NextResponse.json(
      { message: 'Platnost oprávnění k revizím vypršela. Kontaktujte administrátora.' },
      { status: 403 }
    );
  }
  return null;
}
