import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await prisma.supportTicket.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
      }
    });

    return NextResponse.json(tickets);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error fetching tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, category, messageText, attachmentUrl, fileName } = await req.json();
    if (!subject || !messageText) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: session.user.id,
        subject,
        category: category || 'GENERAL',
        messages: {
          create: {
            senderId: session.user.id,
            text: messageText,
            attachmentUrl,
            fileName
          }
        }
      }
    });

    return NextResponse.json(ticket);
  } catch (err: any) {
    return NextResponse.json({ error: 'Error creating ticket' }, { status: 500 });
  }
}
