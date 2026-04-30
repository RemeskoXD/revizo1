import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`prop-claim:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho pokusů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ token?: string }>(req, 8192);
    const token = body.token != null ? String(body.token).trim().slice(0, 200) : '';

    if (!token) {
      return NextResponse.json({ message: 'Token is required' }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { transferToken: token }
    });

    if (!property) {
      return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    }

    if (property.ownerId === session.user.id) {
      return NextResponse.json({ message: 'You already own this property' }, { status: 400 });
    }

    const updated = await prisma.property.update({
      where: { transferToken: token },
      data: {
        transferStatus: 'CLAIMED',
        claimedById: session.user.id
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Error claiming property:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
