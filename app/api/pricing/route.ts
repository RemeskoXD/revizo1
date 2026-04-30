import { NextResponse } from 'next/server';
import { getSubscriptionPrices, getServicePrices, getUrgentSurcharge } from '@/lib/pricing-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [subscriptions, services, urgentSurcharge] = await Promise.all([
    getSubscriptionPrices(),
    getServicePrices(),
    getUrgentSurcharge()
  ]);

  return NextResponse.json({
    subscriptions,
    services,
    urgentSurcharge,
  });
}
