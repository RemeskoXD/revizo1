import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserForPlatbaTestOnboarding } from '@/lib/prisma-subscription-column';
import { isFakePaymentGatewayEnabled, resolveStripeSettingsReturnPath } from '@/lib/stripe-config';
import { getPricingDatabase } from '@/lib/pricing-db';
import { OBJECT_ADDONS } from '@/lib/subscription-pricing';
import FakePaymentUI from './FakePaymentUI';

export const metadata = {
  title: 'Testovací platba | Revizone',
  robots: { index: false, follow: false },
};

export default async function PlatbaTestPage({
  searchParams,
}: {
  searchParams: Promise<{ rp?: string; m?: string; purpose?: string; addon?: string; qty?: string }>;
}) {
  if (!isFakePaymentGatewayEnabled()) {
    redirect('/dashboard/settings?tab=billing');
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/platba-test');
  }

  const q = await searchParams;
  const returnPath = resolveStripeSettingsReturnPath(q.rp);
  const mode = q.m === 'portal' ? 'portal' : 'checkout';
  const purpose =
    q.purpose === 'onboarding'
      ? 'onboarding'
      : q.purpose === 'order'
        ? 'order'
        : q.purpose === 'addon'
          ? 'addon'
          : 'settings';

  const row = await findUserForPlatbaTestOnboarding(session.user.id);

  if (purpose === 'onboarding' && !row?.requiresSubscriptionCheckout) {
    redirect(returnPath);
  }

  // Doplňková platba (rozšíření počtu objektů)
  if (purpose === 'addon') {
    const addon =
      q.addon === 'CUSTOMER_EXTRA_OBJECT' || q.addon === 'PACKAGE_10_OBJECTS'
        ? (q.addon as 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS')
        : null;

    if (!addon) {
      redirect(returnPath);
    }

    const qtyN = Number(q.qty);
    const quantity = Number.isFinite(qtyN) && qtyN >= 1 ? Math.min(Math.floor(qtyN), 100) : 1;

    const addonInfo = OBJECT_ADDONS[addon];
    const totalCzk = addonInfo.yearlyPriceCzk * (addon === 'CUSTOMER_EXTRA_OBJECT' ? quantity : 1);

    return (
      <FakePaymentUI
        returnPath={returnPath}
        mode="checkout"
        purpose="addon"
        addon={addon}
        addonQuantity={quantity}
        planLabel={addonInfo.label}
        yearlyPriceCzk={totalCzk}
      />
    );
  }

  const pricingDb = await getPricingDatabase();
  const role = row?.role ?? session.user.role;
  let plan = pricingDb.subscriptions.CUSTOMER;
  if (role === 'TECHNICIAN') plan = pricingDb.subscriptions.TECHNICIAN;
  if (role === 'COMPANY_ADMIN') plan = pricingDb.subscriptions.COMPANY_ADMIN;

  return (
    <FakePaymentUI
      returnPath={returnPath}
      mode={mode}
      purpose={purpose}
      planLabel={plan.label}
      yearlyPriceCzk={plan.yearlyPriceCzk}
    />
  );
}
