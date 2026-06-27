import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendMail } from '@/lib/mail';
import { orderPaymentLinkEmail } from '@/lib/email-templates';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'ADMIN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { readableId: id },
      include: { customer: true }
    });

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    if (session.user.role === 'TECHNICIAN' && order.technicianId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (session.user.role === 'COMPANY_ADMIN' && order.companyId !== session.user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (!order.price || order.price <= 0) return NextResponse.json({ message: 'Order has no price' }, { status: 400 });
    if (order.isPaid) return NextResponse.json({ message: 'Order is already paid' }, { status: 400 });

    if (!order.customer?.email) {
      return NextResponse.json({ message: 'Customer has no email' }, { status: 400 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const paymentUrl = `${baseUrl}/pay/${order.readableId}`;

    const tpl = orderPaymentLinkEmail({
      userName: order.customer.name,
      readableId: order.readableId,
      serviceType: order.serviceType,
      price: order.price,
      paymentUrl,
    });

    await sendMail({ to: order.customer.email, ...tpl });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending payment link:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
