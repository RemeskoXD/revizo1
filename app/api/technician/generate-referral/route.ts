import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export async function POST() {
  const session = await getServerSession(authOptions);
  
  if (!session || session.user.role !== 'TECHNICIAN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (user?.inviteCode) {
      return NextResponse.json({ inviteCode: user.inviteCode });
    }

    const inviteCode = `TECH-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    await prisma.user.update({
      where: { id: session.user.id },
      data: { inviteCode }
    });

    return NextResponse.json({ success: true, inviteCode });
  } catch (error) {
    console.error('Error generating referral code:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
