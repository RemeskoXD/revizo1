import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Heslo je vyžadováno' }, { status: 400 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!admin || !admin.password) {
      return NextResponse.json({ error: 'Administrátor nenalezen' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Nesprávné heslo' }, { status: 401 });
    }

    const userToApprove = await prisma.user.findUnique({
      where: { id }
    });

    if (!userToApprove) {
      return NextResponse.json({ error: 'Uživatel nenalezen' }, { status: 404 });
    }

    let newRole = '';
    if (userToApprove.role === 'PENDING_SUPPORT') {
      newRole = 'SUPPORT';
    } else if (userToApprove.role === 'PENDING_CONTRACTOR') {
      newRole = 'CONTRACTOR';
    } else {
      return NextResponse.json({ error: 'Uživatel není ve stavu čekajícím na schválení' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { role: newRole as any }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error approving team member:', error);
    return NextResponse.json(
      { error: 'Došlo k chybě při schvalování' },
      { status: 500 }
    );
  }
}
