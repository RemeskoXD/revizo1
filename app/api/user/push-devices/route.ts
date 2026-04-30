import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

const MAX_TOKEN = 512;
const ALLOWED_PLATFORMS = new Set(['android', 'ios', 'web']);

/**
 * Registrace FCM (nebo jiného) push tokenu do vaší databáze – stejná MySQL jako Revizone.
 * Mobilní aplikace: po přihlášení odešlete token sem (session cookie / stejná session jako web).
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`push-device:${session.user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho požadavků. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ token?: string; platform?: string }>(req, 4096);
    const raw = body.token != null ? String(body.token).trim() : '';
    if (raw.length < 10 || raw.length > MAX_TOKEN) {
      return NextResponse.json({ message: 'Neplatný token' }, { status: 400 });
    }

    let platform = body.platform != null ? String(body.platform).trim().toLowerCase() : 'android';
    if (!ALLOWED_PLATFORMS.has(platform)) platform = 'android';

    const existing = await prisma.pushDevice.findUnique({ where: { token: raw } });
    if (existing) {
      if (existing.userId !== session.user.id) {
        await prisma.pushDevice.update({
          where: { token: raw },
          data: { userId: session.user.id, platform },
        });
      } else {
        await prisma.pushDevice.update({
          where: { token: raw },
          data: { platform },
        });
      }
    } else {
      await prisma.pushDevice.create({
        data: {
          userId: session.user.id,
          token: raw,
          platform,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('push-devices POST:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}

/** Odhlášení zařízení / zrušení push pro tento token */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await readJsonBody<{ token?: string }>(req, 4096);
    const raw = body.token != null ? String(body.token).trim() : '';
    if (!raw) {
      return NextResponse.json({ message: 'token je povinný' }, { status: 400 });
    }

    await prisma.pushDevice.deleteMany({
      where: { userId: session.user.id, token: raw },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('push-devices DELETE:', error);
    return NextResponse.json({ message: 'Error' }, { status: 500 });
  }
}
