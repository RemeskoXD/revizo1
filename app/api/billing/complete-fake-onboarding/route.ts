import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isFakePaymentGatewayEnabled } from '@/lib/stripe-config';
import { completeFakeSubscriptionOnboarding } from '@/lib/subscription-onboarding';

export async function POST() {
  if (!isFakePaymentGatewayEnabled()) {
    return NextResponse.json({ message: 'Není aktivní testovací platební režim.' }, { status: 403 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const result = await completeFakeSubscriptionOnboarding(session.user.id);
  return NextResponse.json(result);
}
