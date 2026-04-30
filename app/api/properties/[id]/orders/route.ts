import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !['REALTY', 'SVJ'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: propertyId } = await params;

    const rl = rateLimit(`prop-ord:${session.user.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho objednávek. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property || property.ownerId !== session.user.id) {
      return NextResponse.json({ message: 'Property not found or unauthorized' }, { status: 404 });
    }

    const body = await readJsonBody<{
      serviceType?: string;
      propertyType?: string;
      notes?: string | null;
      preferredDate?: string | null;
      address?: string | null;
    }>(req, 96_384);

    const serviceType = body.serviceType != null ? String(body.serviceType).slice(0, 200) : '';
    const propertyType = body.propertyType != null ? String(body.propertyType).slice(0, 120) : 'Byt';
    const notes = body.notes != null ? String(body.notes).slice(0, 4000) : undefined;
    const address =
      body.address != null ? String(body.address).trim().slice(0, 500) : property.address || property.name;
    const preferredDate = body.preferredDate ? new Date(String(body.preferredDate)) : null;

    if (!serviceType) {
      return NextResponse.json({ message: 'Chybí typ služby' }, { status: 400 });
    }

    const idSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const readableId = `ORD-${new Date().getFullYear()}-${idSuffix}`;
    const cancelToken = crypto.randomBytes(24).toString('hex');

    const order = await prisma.order.create({
      data: {
        readableId,
        customerId: session.user.id,
        propertyId: property.id,
        serviceType,
        propertyType,
        address,
        notes,
        preferredDate: preferredDate && !Number.isNaN(preferredDate.getTime()) ? preferredDate : null,
        cancelToken,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Error creating order:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
