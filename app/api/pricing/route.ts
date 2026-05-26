import { NextResponse } from 'next/server';
import { getSubscriptionPrices, getServicePrices, getUrgentSurcharge, getObjectAddons } from '@/lib/pricing-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [subscriptions, services, urgentSurcharge, objectAddons] = await Promise.all([
    getSubscriptionPrices(),
    getServicePrices(),
    getUrgentSurcharge(),
    getObjectAddons(),
  ]);

  return NextResponse.json({
    subscriptions,
    services,
    urgentSurcharge,
    objectAddons: {
      customerExtraObject: {
        label: objectAddons.customerExtraObject.label,
        yearlyPriceCzk: objectAddons.customerExtraObject.yearlyPriceCzk,
        stripePriceId: objectAddons.customerExtraObject.stripePriceId,
        stripeConfigured: Boolean(objectAddons.customerExtraObject.stripePriceId),
      },
      package10Objects: {
        label: objectAddons.package10Objects.label,
        yearlyPriceCzk: objectAddons.package10Objects.yearlyPriceCzk,
        packageLimit: objectAddons.package10Objects.packageLimit,
        stripePriceId: objectAddons.package10Objects.stripePriceId,
        stripeConfigured: Boolean(objectAddons.package10Objects.stripePriceId),
      },
    },
  });
}
