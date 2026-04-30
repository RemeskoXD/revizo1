import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export async function GET(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`banner:${ip}`, 200, 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ message: '', type: 'info' });
  }

  try {
    const banner = await prisma.systemConfig.findUnique({ where: { key: 'global_banner' } });
    const bannerType = await prisma.systemConfig.findUnique({ where: { key: 'global_banner_type' } });

    if (!banner?.value) {
      return NextResponse.json({ message: '', type: 'info' });
    }

    return NextResponse.json({ message: banner.value, type: bannerType?.value || 'info' });
  } catch {
    return NextResponse.json({ message: '', type: 'info' });
  }
}
