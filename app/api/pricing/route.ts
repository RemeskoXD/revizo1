import { NextResponse } from 'next/server';
import { getSubscriptionPrices, getServicePrices, getUrgentSurcharge } from '@/lib/pricing-db';
import { OBJECT_ADDONS } from '@/lib/subscription-pricing';
import {
  OBJECT_PACKAGE_LIMIT,
  OBJECT_EXTRA_PRICE_CZK,
  OBJECT_PACKAGE_PRICE_CZK,
} from '@/lib/object-limits';

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
    objectAddons: {
      customerExtraObject: {
        label: OBJECT_ADDONS.CUSTOMER_EXTRA_OBJECT.label,
        yearlyPriceCzk: OBJECT_EXTRA_PRICE_CZK,
        stripeConfigured: Boolean(OBJECT_ADDONS.CUSTOMER_EXTRA_OBJECT.stripePriceId),
      },
      package10Objects: {
        label: OBJECT_ADDONS.PACKAGE_10_OBJECTS.label,
        yearlyPriceCzk: OBJECT_PACKAGE_PRICE_CZK,
        packageLimit: OBJECT_PACKAGE_LIMIT,
        stripeConfigured: Boolean(OBJECT_ADDONS.PACKAGE_10_OBJECTS.stripePriceId),
      },
    },
  });
}
