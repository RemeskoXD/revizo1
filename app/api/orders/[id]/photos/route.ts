import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';

const MAX_IMAGE_DATA_CHARS = 7_200_000;
const MAX_CAPTION = 500;

type SessionUser = { user: { id: string; role: string } };

type OrderGate = {
  id: string;
  customerId: string;
  technicianId: string | null;
  companyId: string | null;
  isPublic: boolean;
};

function canViewPhotos(session: SessionUser, order: OrderGate): boolean {
  const role = session.user.role;
  const uid = session.user.id;
  if (role === 'ADMIN') return true;
  if (order.customerId === uid) return true;
  if (order.technicianId === uid) return true;
  if (order.companyId === uid) return true;
  if (role === 'COMPANY_ADMIN' && order.companyId === uid) return true;
  if (order.isPublic && (role === 'TECHNICIAN' || role === 'COMPANY_ADMIN')) return true;
  return false;
}

function canUploadPhoto(session: SessionUser, order: OrderGate): boolean {
  const role = session.user.role;
  const uid = session.user.id;
  if (role === 'ADMIN') return true;
  if (role === 'TECHNICIAN' && order.technicianId === uid) return true;
  if (role === 'COMPANY_ADMIN' && order.companyId === uid) return true;
  return false;
}

async function loadOrder(id: string): Promise<OrderGate | null> {
  return prisma.order.findFirst({
    where: { OR: [{ id }, { readableId: id }] },
    select: {
      id: true,
      customerId: true,
      technicianId: true,
      companyId: true,
      isPublic: true,
    },
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json([], { status: 401 });

    const { id } = await params;
    const order = await loadOrder(id);
    if (!order) {
      return NextResponse.json({ message: 'Zakázka nenalezena' }, { status: 404 });
    }
    if (!canViewPhotos(session as SessionUser, order)) {
      return NextResponse.json({ message: 'Nepovolený přístup' }, { status: 403 });
    }

    const photos = await prisma.orderPhoto.findMany({
      where: { orderId: order.id },
      select: { id: true, caption: true, uploadedBy: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(photos);
  } catch (error) {
    console.error('Get photos error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const order = await loadOrder(id);
    if (!order) {
      return NextResponse.json({ message: 'Zakázka nenalezena' }, { status: 404 });
    }
    if (!canUploadPhoto(session as SessionUser, order)) {
      return NextResponse.json({ message: 'Fotografie může nahrát jen přiřazený technik nebo firma' }, { status: 403 });
    }

    const rl = rateLimit(`photo-upload:${session.user.id}:${order.id}`, 40, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho nahrání. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
      );
    }

    const count = await prisma.orderPhoto.count({ where: { orderId: order.id } });
    if (count >= 80) {
      return NextResponse.json({ message: 'U této zakázky je již maximum fotografií' }, { status: 400 });
    }

    const body = await readJsonBody<{ imageData?: string; caption?: string | null }>(req, MAX_IMAGE_DATA_CHARS + 50_000);

    const imageData = body.imageData;
    const caption = body.caption;

    if (!imageData || typeof imageData !== 'string') {
      return NextResponse.json({ message: 'Chybí fotografie' }, { status: 400 });
    }
    if (imageData.length > MAX_IMAGE_DATA_CHARS) {
      return NextResponse.json({ message: 'Soubor je příliš velký' }, { status: 413 });
    }
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json({ message: 'Povolené jsou jen obrázky (data:image/…)' }, { status: 400 });
    }

    const captionSafe = caption != null ? String(caption).slice(0, MAX_CAPTION) : null;

    const photo = await prisma.orderPhoto.create({
      data: {
        orderId: order.id,
        imageData,
        caption: captionSafe,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(
      { id: photo.id, caption: photo.caption, createdAt: photo.createdAt },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Požadavek je příliš velký' }, { status: 413 });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Neplatný formát dat' }, { status: 400 });
    }
    console.error('Upload photo error:', error);
    return NextResponse.json({ message: 'Interní chyba' }, { status: 500 });
  }
}
