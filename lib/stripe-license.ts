import { updateUserWithSubscriptionColumnFallback } from '@/lib/prisma-subscription-column';

/**
 * Výpočet konce platnosti licence od data platby (např. měsíční / roční předplatné).
 * Z webhooku Stripe po úspěšné platbě zavolejte `applyLicenseAfterPayment`.
 */
export function computeLicenseValidUntil(paidAt: Date, periodMonths: number): Date {
  const d = new Date(paidAt.getTime());
  d.setMonth(d.getMonth() + Math.max(1, Math.min(120, periodMonths)));
  return d;
}

export type ApplyLicenseParams = {
  userId: string;
  paidAt: Date;
  /** Počet měsíců platnosti od poslední platby (např. 12 u ročního předplatného) */
  periodMonths: number;
  stripeCustomerId?: string | null;
};

/**
 * Aktualizuje uživatele po přijaté platbě Stripe.
 * Napojení: route handler nebo Stripe webhook po `checkout.session.completed` / `invoice.paid`.
 */
export async function applyLicenseAfterPayment(params: ApplyLicenseParams) {
  const { userId, paidAt, periodMonths, stripeCustomerId } = params;
  const licenseValidUntil = computeLicenseValidUntil(paidAt, periodMonths);

  await updateUserWithSubscriptionColumnFallback({
    where: { id: userId },
    data: {
      lastStripePaymentAt: paidAt,
      licenseValidUntil,
      requiresSubscriptionCheckout: false,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
    },
  });

  return { licenseValidUntil };
}
