import { redirect } from 'next/navigation';
import { buildPlatbaTestOnboardingUrl, isFakePaymentGatewayEnabled } from '@/lib/stripe-config';
import { userRequiresSubscriptionOnboarding } from '@/lib/prisma-subscription-column';

const ONBOARDING_ROLES = new Set(['CUSTOMER', 'TECHNICIAN', 'COMPANY_ADMIN']);

export function subscriptionSettingsPathForRole(role: string): string {
  return role === 'COMPANY_ADMIN' ? '/company/settings' : '/dashboard/settings';
}

/** Přesměruje na dokončení předplatného, pokud to uživatel ještě neudělal. */
export async function redirectIfSubscriptionOnboardingRequired(
  userId: string,
  role: string
): Promise<void> {
  if (!ONBOARDING_ROLES.has(role)) return;

  const needsCheckout = await userRequiresSubscriptionOnboarding(userId);
  if (!needsCheckout) return;

  const returnPath = subscriptionSettingsPathForRole(role);

  if (isFakePaymentGatewayEnabled()) {
    redirect(buildPlatbaTestOnboardingUrl(returnPath));
  }
  redirect(`${returnPath}?tab=billing`);
}
