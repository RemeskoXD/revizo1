import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

const ALLOWED_ROLES = new Set([
  'TECHNICIAN',
  'COMPANY_ADMIN',
  'REALTY',
  'SVJ',
  'PRODUCT_MANAGER',
]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const limited = rateLimit(`role-req:${session.user.id}`, 15, 24 * 60 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho žádostí o změnu role. Zkuste to zítra.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{ requestedRole?: string }>(req, 4096);
    const { requestedRole } = body;

    if (!requestedRole || !ALLOWED_ROLES.has(requestedRole)) {
      return NextResponse.json({ message: 'Invalid role requested' }, { status: 400 });
    }

    const existingRequest = await prisma.roleRequest.findFirst({
      where: {
        userId: session.user.id,
        status: 'PENDING',
      },
    });

    if (existingRequest) {
      return NextResponse.json({ message: 'You already have a pending role request' }, { status: 400 });
    }

    const roleRequest = await prisma.roleRequest.create({
      data: {
        userId: session.user.id,
        requestedRole,
      },
    });

    return NextResponse.json({ message: 'Role request created successfully', roleRequest }, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Role request error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
