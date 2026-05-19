import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';
import { rateLimit } from '@/lib/rate-limit';
import { ROLES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES: ReadonlySet<string> = new Set([
  ROLES.COMPANY_ADMIN,
  ROLES.SVJ,
]);

const MAX_FILE_BYTES_BASE64 = 5_500_000; // ~4 MB binary

/** Seznam firemních dokumentů (svářečské průkazy, prohlídky …). */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!ALLOWED_ROLES.has(session.user.role)) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const documents = await prisma.companyDocument.findMany({
    where: { ownerId: session.user.id },
    orderBy: [{ validUntil: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      title: true,
      category: true,
      fileMimeType: true,
      fileName: true,
      validUntil: true,
      notes: true,
      subjectName: true,
      subjectUserId: true,
      createdAt: true,
      updatedAt: true,
      // úmyslně bez fileBase64 (těžké pro list)
    },
  });

  const now = Date.now();
  const enriched = documents.map((d) => {
    const validUntil = d.validUntil ? new Date(d.validUntil) : null;
    let state: 'NO_DATE' | 'VALID' | 'EXPIRES_SOON' | 'EXPIRED' = 'NO_DATE';
    let daysLeft: number | null = null;
    if (validUntil) {
      const diff = validUntil.getTime() - now;
      daysLeft = Math.ceil(diff / (24 * 60 * 60 * 1000));
      if (diff <= 0) state = 'EXPIRED';
      else if (daysLeft <= 30) state = 'EXPIRES_SOON';
      else state = 'VALID';
    }
    return {
      ...d,
      validUntil: validUntil ? validUntil.toISOString() : null,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      state,
      daysLeft,
      hasFile: false, // doplníme v rámci detail endpointu
    };
  });

  return NextResponse.json({ documents: enriched });
}

/** Vytvořit nový hlídaný dokument. */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    if (!ALLOWED_ROLES.has(session.user.role)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const rl = rateLimit(`co-doc-create:${session.user.id}`, 60, 60 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { message: 'Příliš mnoho nových dokumentů. Zkuste to později.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      );
    }

    const body = await readJsonBody<{
      title?: string;
      category?: string;
      fileBase64?: string;
      fileMimeType?: string;
      fileName?: string;
      validUntil?: string | null;
      notes?: string;
      subjectName?: string;
      subjectUserId?: string;
    }>(req, 6_600_000);

    const title = body.title ? String(body.title).trim().slice(0, 255) : '';
    if (!title) {
      return NextResponse.json({ message: 'Název je povinný' }, { status: 400 });
    }

    let validUntil: Date | null = null;
    if (body.validUntil) {
      const d = new Date(String(body.validUntil));
      if (!Number.isNaN(d.getTime())) validUntil = d;
    }

    const file = parseFileInput(body);
    if (file && file.base64.length > MAX_FILE_BYTES_BASE64) {
      return NextResponse.json(
        { message: 'Soubor je příliš velký (max. 4 MB)' },
        { status: 413 },
      );
    }

    const created = await prisma.companyDocument.create({
      data: {
        ownerId: session.user.id,
        title,
        category: body.category ? String(body.category).trim().slice(0, 80) : null,
        fileBase64: file ? file.base64 : null,
        fileMimeType: file ? file.mime : null,
        fileName: body.fileName ? String(body.fileName).trim().slice(0, 255) : null,
        validUntil,
        notes: body.notes ? String(body.notes).trim().slice(0, 2000) : null,
        subjectName: body.subjectName ? String(body.subjectName).trim().slice(0, 160) : null,
        subjectUserId: body.subjectUserId ? String(body.subjectUserId).trim().slice(0, 60) : null,
      },
      select: { id: true },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e) {
    if (e instanceof PayloadTooLargeError) {
      return NextResponse.json({ message: 'Soubor je příliš velký' }, { status: 413 });
    }
    console.error('Create company document error:', e);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

function parseFileInput(body: { fileBase64?: string; fileMimeType?: string }): { base64: string; mime: string } | null {
  const raw = body.fileBase64?.trim();
  if (!raw) return null;
  const m = raw.match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (m) {
    return { mime: m[1].slice(0, 120), base64: m[2].replace(/\s/g, '') };
  }
  return {
    mime: body.fileMimeType ? String(body.fileMimeType).slice(0, 120) : 'application/octet-stream',
    base64: raw.replace(/\s/g, ''),
  };
}
