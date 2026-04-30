import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { action } = await req.json(); // 'ACCEPT' or 'REJECT'

    if (!['ACCEPT', 'REJECT'].includes(action)) {
      return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }

    // Find transfer
    const transfer = await prisma.documentTransfer.findUnique({
      where: { id },
    });

    if (!transfer) {
      return NextResponse.json({ message: 'Transfer not found' }, { status: 404 });
    }

    if (transfer.receiverId !== session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
    }

    if (transfer.status !== 'PENDING') {
      return NextResponse.json({ message: 'Transfer is already processed' }, { status: 400 });
    }

    if (action === 'ACCEPT') {
      // Update transfer status
      await prisma.documentTransfer.update({
        where: { id: transfer.id },
        data: { status: 'ACCEPTED' },
      });

      // Update order customerId
      await prisma.order.update({
        where: { readableId: transfer.documentId },
        data: { customerId: session.user.id },
      });
    } else {
      // Reject transfer
      await prisma.documentTransfer.update({
        where: { id: transfer.id },
        data: { status: 'REJECTED' },
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Process transfer error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
