import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`prop-create:${session.user.id}`, 30, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho nových nemovitostí. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{
      name?: string;
      address?: string;
      description?: string | null;
    }>(req, 48_384);

    const name = body.name != null ? String(body.name).trim().slice(0, 200) : '';
    const address = body.address != null ? String(body.address).trim().slice(0, 500) : '';
    const description =
      body.description != null ? String(body.description).trim().slice(0, 8000) : undefined;

    if (!name) {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        name,
        address: address || undefined,
        description,
        ownerId: session.user.id,
      },
      include: {
        orders: true,
        claimedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(property);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Error creating property:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
