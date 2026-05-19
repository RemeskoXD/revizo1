import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';
import { filterCategoriesByRole } from '@/lib/revision-categories';

/**
 * Vrátí kategorie revizí.
 * Pokud je uživatel přihlášen, vrátí jen kategorie cílené pro jeho roli
 * (viz `RevisionCategory.targetRoles`).
 * Anonymní volání vrací všechny aktivní kategorie.
 *
 * Query: ?role=ROLE (volitelné, např. pro admin / debug)
 */
export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`revisions:${ip}`, 120, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json([]);
  }

  try {
    const url = new URL(req.url);
    const roleParam = url.searchParams.get('role')?.trim().toUpperCase() || null;
    const session = roleParam ? null : await getServerSession(authOptions);
    const effectiveRole = roleParam || session?.user?.role || null;

    const categories = await prisma.revisionCategory.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        group: true,
        intervalMonths: true,
        targetRoles: true,
      },
    });

    const visible = effectiveRole
      ? filterCategoriesByRole(categories, effectiveRole)
      : categories;

    // Pro klienta nevrátíme `targetRoles` (interní detail).
    return NextResponse.json(
      visible.map(({ targetRoles: _t, ...rest }) => rest),
    );
  } catch (error) {
    console.error('Get revision categories error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
