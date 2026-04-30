import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Náhled nahraného oprávnění (PDF/obrázek) pro admina. */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['ADMIN', 'SUPPORT'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { licenseDocument: true, licenseMimeType: true, accountStatus: true, role: true },
    });

    if (!user?.licenseDocument) {
      return NextResponse.json({ message: 'Nenalezeno' }, { status: 404 });
    }

    const mime = user.licenseMimeType || 'application/pdf';
    const buf = Buffer.from(user.licenseDocument, 'base64');

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': 'inline; filename="opravneni"',
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    console.error('license GET', e);
    return NextResponse.json({ message: 'Chyba' }, { status: 500 });
  }
}
