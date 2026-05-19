import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody } from '@/lib/json-body';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: ReadonlySet<string> = new Set([
  ROLES.COMPANY_ADMIN,
  ROLES.SVJ,
]);

async function authorize(req: Request, id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { ok: false as const, response: NextResponse.json({ message: 'Unauthorized' }, { status: 401 }) };
  }
  if (!ALLOWED_ROLES.has(session.user.role)) {
    return { ok: false as const, response: NextResponse.json({ message: 'Forbidden' }, { status: 403 }) };
  }
  const doc = await prisma.companyDocument.findUnique({ where: { id } });
  if (!doc || doc.ownerId !== session.user.id) {
    return { ok: false as const, response: NextResponse.json({ message: 'Not found' }, { status: 404 }) };
  }
  return { ok: true as const, session, doc };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const wantFile = url.searchParams.get('file') === '1';

  if (wantFile) {
    const doc = auth.doc;
    if (!doc.fileBase64 || !doc.fileMimeType) {
      return NextResponse.json({ message: 'No file' }, { status: 404 });
    }
    const buffer = Buffer.from(doc.fileBase64, 'base64');
    const response = new NextResponse(buffer);
    response.headers.set('Content-Type', doc.fileMimeType);
    const name = doc.fileName || `${doc.title}.${doc.fileMimeType.split('/')[1] || 'bin'}`;
    response.headers.set('Content-Disposition', `attachment; filename="${name.replace(/"/g, '')}"`);
    return response;
  }

  // Detail bez souboru
  return NextResponse.json({
    id: auth.doc.id,
    title: auth.doc.title,
    category: auth.doc.category,
    fileMimeType: auth.doc.fileMimeType,
    fileName: auth.doc.fileName,
    validUntil: auth.doc.validUntil ? auth.doc.validUntil.toISOString() : null,
    notes: auth.doc.notes,
    subjectName: auth.doc.subjectName,
    subjectUserId: auth.doc.subjectUserId,
    createdAt: auth.doc.createdAt.toISOString(),
    updatedAt: auth.doc.updatedAt.toISOString(),
    hasFile: Boolean(auth.doc.fileBase64),
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if (!auth.ok) return auth.response;

  const body = await readJsonBody<{
    title?: string;
    category?: string | null;
    validUntil?: string | null;
    notes?: string | null;
    subjectName?: string | null;
    subjectUserId?: string | null;
  }>(req, 16_384).catch(() => ({}) as Record<string, unknown>);

  const data: Record<string, unknown> = {};
  if (typeof body.title === 'string') {
    const t = body.title.trim().slice(0, 255);
    if (t) data.title = t;
  }
  if (body.category !== undefined)
    data.category = body.category === null ? null : String(body.category).trim().slice(0, 80) || null;
  if (body.notes !== undefined)
    data.notes = body.notes === null ? null : String(body.notes).trim().slice(0, 2000) || null;
  if (body.subjectName !== undefined)
    data.subjectName =
      body.subjectName === null ? null : String(body.subjectName).trim().slice(0, 160) || null;
  if (body.subjectUserId !== undefined)
    data.subjectUserId =
      body.subjectUserId === null ? null : String(body.subjectUserId).trim().slice(0, 60) || null;
  if (body.validUntil !== undefined) {
    if (body.validUntil === null || body.validUntil === '') {
      data.validUntil = null;
    } else {
      const d = new Date(String(body.validUntil));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ message: 'Neplatné datum' }, { status: 400 });
      }
      data.validUntil = d;
    }
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ message: 'No valid fields' }, { status: 400 });
  }
  const updated = await prisma.companyDocument.update({
    where: { id },
    data,
    select: { id: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await authorize(req, id);
  if (!auth.ok) return auth.response;
  await prisma.companyDocument.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
