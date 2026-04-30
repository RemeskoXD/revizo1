import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`revisions:${ip}`, 120, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json([]);
  }

  try {
    const categories = await prisma.revisionCategory.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, group: true, intervalMonths: true },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Get revision categories error:', error);
    return NextResponse.json([], { status: 500 });
  }
}
