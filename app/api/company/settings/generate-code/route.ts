import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'COMPANY_ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate a unique code (e.g., FIRMA-A1B2C3D4)
    const randomString = randomBytes(4).toString('hex').toUpperCase();
    const inviteCode = `FIRMA-${randomString}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { inviteCode }
    });

    return NextResponse.json({ success: true, inviteCode });
  } catch (error) {
    console.error('Generate code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
