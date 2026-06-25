import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true, role: true } },
        messages: {
          include: { sender: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUPPORT';
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error fetching ticket' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    const { status } = await req.json();

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUPPORT';
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.supportTicket.update({
      where: { id },
      data: { status }
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error updating ticket' }, { status: 500 });
  }
}
