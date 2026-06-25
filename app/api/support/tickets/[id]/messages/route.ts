import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readJsonBody, PayloadTooLargeError } from '@/lib/json-body';

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await context.params;
    
    let text = '', attachmentUrl = null, fileName = null;
    try {
      const data = await readJsonBody<any>(req, 10_000_000);
      text = data.text;
      attachmentUrl = data.attachmentUrl;
      fileName = data.fileName;
    } catch (err: any) {
      if (err instanceof PayloadTooLargeError) {
        return NextResponse.json({ error: 'Soubor je příliš velký' }, { status: 413 });
      }
      return NextResponse.json({ error: 'Neplatná data' }, { status: 400 });
    }

    if (!text && !attachmentUrl) return NextResponse.json({ error: 'Missing content' }, { status: 400 });

    const ticket = await prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPER_ADMIN' || session.user.role === 'SUPPORT';
    if (ticket.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    if (ticket.status === 'CLOSED') {
      return NextResponse.json({ error: 'Tiket je uzavřen' }, { status: 400 });
    }

    const msg = await prisma.supportTicketMessage.create({
      data: {
        ticketId: id,
        senderId: session.user.id,
        text,
        attachmentUrl,
        fileName
      },
      include: {
        sender: { select: { id: true, name: true, role: true } }
      }
    });

    return NextResponse.json(msg);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Error sending message' }, { status: 500 });
  }
}
