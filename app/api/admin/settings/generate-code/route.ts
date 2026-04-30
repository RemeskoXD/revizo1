import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    const inviteCode = `ADMIN-${randomString}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { inviteCode }
    });

    return NextResponse.json({ success: true, inviteCode });
  } catch (error) {
    console.error('Error generating invite code:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
