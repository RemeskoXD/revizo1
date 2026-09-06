import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { normalizeAddress } from '@/lib/object-limits';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true, address: true, ico: true, bankAccount: true, role: true, objectLimitExtraPaid: true }
    });
    
    const [ordersCount, customerOrders] = await Promise.all([
      prisma.order.count({
        where: { customerId: session.user.id }
      }),
      prisma.order.findMany({
        where: { customerId: session.user.id, isDeleted: false },
        select: { address: true },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    // Build unique clean addresses
    const addressMap = new Map<string, string>(); // normalized -> original trimmed
    if (user?.address && user.address.trim().length > 3) {
      addressMap.set(normalizeAddress(user.address), user.address.trim());
    }
    for (const ord of customerOrders) {
      if (ord.address && ord.address.trim().length > 3) {
        const norm = normalizeAddress(ord.address);
        if (!addressMap.has(norm)) {
          addressMap.set(norm, ord.address.trim());
        }
      }
    }
    const existingAddresses = Array.from(addressMap.values());
    const uniqueAddressesCount = addressMap.size;
    
    return NextResponse.json({
      ...user,
      ordersCount,
      existingAddresses,
      uniqueAddressesCount
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rl = rateLimit(`profile:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho úprav profilu. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const body = await readJsonBody<{
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      bankAccount?: string | null;
      ico?: string | null;
      address?: string | null;
      emailNotifications?: boolean;
    }>(req, 16_384);

    const first = body.firstName != null ? String(body.firstName).trim().slice(0, 80) : '';
    const last = body.lastName != null ? String(body.lastName).trim().slice(0, 80) : '';
    const phone = body.phone != null ? String(body.phone).trim().slice(0, 40) : undefined;
    const bankAccount = body.bankAccount != null ? String(body.bankAccount).trim().slice(0, 100) : undefined;
    const ico = body.ico != null ? String(body.ico).trim().slice(0, 20) : undefined;
    const address = body.address != null ? String(body.address).trim().slice(0, 500) : undefined;

    const name = `${first} ${last}`.trim();
    if (name.length < 2) {
      return NextResponse.json({ message: 'Jméno je příliš krátké' }, { status: 400 });
    }

    const data: { name: string; phone?: string; bankAccount?: string; ico?: string; address?: string; emailNotifications?: boolean } = { name, phone, bankAccount, ico, address };
    if (typeof body.emailNotifications === 'boolean') {
      data.emailNotifications = body.emailNotifications;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data,
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Update profile error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
