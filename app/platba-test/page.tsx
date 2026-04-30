import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { findUserForPlatbaTestOnboarding } from '@/lib/prisma-subscription-column';
import { isFakePaymentGatewayEnabled, resolveStripeSettingsReturnPath } from '@/lib/stripe-config';
import { getPricingDatabase } from '@/lib/pricing-db';
import FakePaymentUI from './FakePaymentUI';

export const metadata = {
  title: 'Testovací platba | Revizone',
  robots: { index: false, follow: false },
};

export default async function PlatbaTestPage({
  searchParams,
}: {
  searchParams: Promise<{ rp?: string; m?: string; purpose?: string }>;
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
  const purpose = q.purpose === 'onboarding' ? 'onboarding' : 'settings';

  const row = await findUserForPlatbaTestOnboarding(session.user.id);

  if (purpose === 'onboarding' && !row?.requiresSubscriptionCheckout) {
    redirect(returnPath);
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
