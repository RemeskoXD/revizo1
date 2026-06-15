import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe } from '@/lib/stripe-client';
import { getAppBaseUrl, isFakePaymentGatewayEnabled } from '@/lib/stripe-config';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id: readableId } = await params;
    
    const order = await prisma.order.findUnique({
      where: { readableId },
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (order.customerId !== session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (order.isPaid || !order.price || order.price <= 0) {
      return NextResponse.json({ message: 'Order is already paid or has no price' }, { status: 400 });
    }

    const base = getAppBaseUrl();
    
    if (isFakePaymentGatewayEnabled()) {
      const url = `${base}/platba-test?rp=${encodeURIComponent('/dashboard')}&m=checkout&purpose=order&orderId=${order.readableId}`;
      return NextResponse.json({ url });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ message: 'Stripe is not configured' }, { status: 500 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'czk',
          product_data: {
            name: `Revize: ${order.serviceType}`,
            description: `Adresa: ${order.address} (ID: ${order.readableId})`,
          },
          unit_amount: Math.round(order.price * 100),
        },
        quantity: 1,
      }],
      success_url: `${base}/dashboard/orders/${order.readableId}?order_payment=success`,
      cancel_url: `${base}/dashboard/orders/${order.readableId}?order_payment=cancel`,
      client_reference_id: order.id,
      metadata: { orderId: order.id, userId: session.user.id, type: "ONEOFF_ORDER" },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Error generating checkout:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
