import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { getNextAuthJwtSecret } from '@/lib/jwt-secret';

/**
 * Odpovědi GET jsou uzpůsobeny mobilnímu pollingu (Android WebView / CookieManager):
 * – při úspěchu vždy 200 a pole (i prázdné []), nikdy 404 „prázdná kolekce“;
 * – při výpadku DB vracíme stále 200 + [] (aby klient nekousal chybu při každém ticku), viz hlavička X-Notifications-Degraded;
 * – session: cookie (HttpOnly) nebo Authorization: Bearer &lt;stejný JWT jako session token&gt; – viz getToken v next-auth/jwt.
 * Produkce: HTTPS povinný (Android 13+).
 */

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
} as const;

async function resolveSessionUserId(req: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (session?.user?.id) return session.user.id;

  const token = await getToken({
    req: req as Parameters<typeof getToken>[0]['req'],
    secret: getNextAuthJwtSecret(),
  });
  if (token?.sub) return token.sub as string;
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await resolveSessionUserId(req);
    if (!userId) {
      return NextResponse.json([], { status: 401, headers: NO_CACHE_HEADERS });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json(notifications, { status: 200, headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error('Get notifications error:', error);
    const headers = new Headers(NO_CACHE_HEADERS);
    headers.set('X-Notifications-Degraded', '1');
    return NextResponse.json([], { status: 200, headers });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await resolveSessionUserId(req);
    if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`notif-patch:${userId}`, 120, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Too many requests' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ action?: string; notificationId?: string }>(req, 8192);
    const { action, notificationId } = body;

    if (action === 'read_all') {
      await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'All marked as read' });
    }

    if (action === 'read' && notificationId) {
      const nid = String(notificationId).slice(0, 80);
      const notification = await prisma.notification.findUnique({
        where: { id: nid },
        select: { userId: true },
      });
      if (!notification || notification.userId !== userId) {
        return NextResponse.json({ message: 'Not found' }, { status: 404 });
      }
      await prisma.notification.update({
        where: { id: nid },
        data: { isRead: true },
      });
      return NextResponse.json({ message: 'Marked as read' });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Update notifications error:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
