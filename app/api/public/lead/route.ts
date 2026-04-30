import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const limited = rateLimit(`lead:${ip}`, 25, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Příliš mnoho odeslání. Zkuste to později.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  try {
    const body = await readJsonBody<{
      address?: string;
      name?: string;
      email?: string;
      phone?: string;
      serviceType?: string;
      termsAccepted?: boolean;
    }>(req, 24_576);

    const { address, name, email, phone, serviceType, termsAccepted } = body;

    if (!address || !name || !email || !phone || !termsAccepted) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const emailNorm = String(email).trim().toLowerCase().slice(0, 254);
    if (!EMAIL_RE.test(emailNorm)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    const nameTrim = String(name).trim().slice(0, 120);
    const addressTrim = String(address).trim().slice(0, 500);
    const phoneTrim = String(phone).trim().slice(0, 40);

    if (nameTrim.length < 2 || addressTrim.length < 5) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({
      where: { email: emailNorm },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: nameTrim,
          email: emailNorm,
          phone: phoneTrim,
          role: 'CUSTOMER',
        },
      });
    }

    const count = await prisma.order.count();
    const readableId = `LEAD-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const order = await prisma.order.create({
      data: {
        readableId,
        customerId: user.id,
        serviceType: (serviceType || 'Bezplatná kontrola oken u vás doma').slice(0, 200),
        propertyType: 'Nezadáno',
        address: addressTrim,
        status: 'PENDING',
        isPublic: true,
      },
    });

    return NextResponse.json({ success: true, orderId: order.id });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('Lead creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
