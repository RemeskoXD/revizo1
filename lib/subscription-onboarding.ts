import {
  addCalendarMonths,
  licenseValidUntilAfterAnnualPay,
} from '@/lib/subscription-pricing';
import {
  findUserForCompleteFakeOnboarding,
  updateUserWithSubscriptionColumnFallback,
} from '@/lib/prisma-subscription-column';
import { tryCreateReferralReward } from '@/lib/referral';

/**
 * Dokončení „první roční platby“ po onboardingové bráně (fake Stripe).
 * Prodlouží licenci od konce 1měsíční zkušební lhůty o 12 měsíců.
 */
export async function completeFakeSubscriptionOnboarding(userId: string) {
  const user = await findUserForCompleteFakeOnboarding(userId);

  if (!user?.requiresSubscriptionCheckout) {
    return { ok: true as const, alreadyDone: true as const };
  }

  const trialEnd = user.licenseValidUntil ?? addCalendarMonths(new Date(), 1);
  const newUntil = licenseValidUntilAfterAnnualPay(trialEnd);

  await updateUserWithSubscriptionColumnFallback({
    where: { id: userId },
    data: {
      requiresSubscriptionCheckout: false,
      licenseValidUntil: newUntil,
    },
  });

  // Referral – po fake platbě CUSTOMER vytvoří odměnu makléři (idempotentní).
  tryCreateReferralReward(userId).catch((e) => console.error('Referral reward failed:', e));

  return { ok: true as const, alreadyDone: false as const, licenseValidUntil: newUntil };
}
