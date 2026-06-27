import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getStripe } from '@/lib/stripe-client';
import { getAppBaseUrl } from '@/lib/stripe-config';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['TECHNICIAN', 'COMPANY_ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const amount = parseInt(body.amount, 10);
    
    if (isNaN(amount) || amount < 100 || amount > 100000) {
      return NextResponse.json({ message: 'Neplatná částka. Minimum je 100 Kč.' }, { status: 400 });
    }

    const base = getAppBaseUrl();
    const returnUrl = new URL(body.returnPath || '/dashboard/settings?tab=billing', base);
    const successUrl = new URL(returnUrl.toString());
    successUrl.searchParams.set('stripe', 'success_credit');

    const cancelUrl = new URL(returnUrl.toString());
    cancelUrl.searchParams.set('stripe', 'cancel');

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ message: 'Stripe is not configured' }, { status: 400 });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      client_reference_id: session.user.id,
      metadata: {
        userId: session.user.id,
        type: 'CREDIT_TOPUP',
        amountCzk: amount.toString()
      },
      line_items: [
        {
          price_data: {
            currency: 'czk',
            product_data: {
              name: 'Dobití kreditu',
              description: `Dobití ${amount} kreditů do systému.`,
            },
            unit_amount: amount * 100, // v haléřích
          },
          quantity: 1,
        },
      ],
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    });

    return NextResponse.json({ url: checkoutSession.url }, { status: 200 });
  } catch (error) {
    console.error('Credit checkout error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
