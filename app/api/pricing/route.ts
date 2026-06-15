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
      companyTechSeat: objectAddons.companyTechSeat ? {
        label: objectAddons.companyTechSeat.label,
        monthlyPriceCzk: objectAddons.companyTechSeat.monthlyPriceCzk,
        stripePriceId: objectAddons.companyTechSeat.stripePriceId,
        stripeConfigured: Boolean(objectAddons.companyTechSeat.stripePriceId),
      } : undefined,
      realtyTransferFee: objectAddons.realtyTransferFee ? {
        label: objectAddons.realtyTransferFee.label,
        priceCzk: objectAddons.realtyTransferFee.priceCzk,
        stripePriceId: objectAddons.realtyTransferFee.stripePriceId,
        stripeConfigured: Boolean(objectAddons.realtyTransferFee.stripePriceId),
      } : undefined,
    },
  });
}
