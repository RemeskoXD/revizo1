/** Roční předplatné po 1 měsíci zdarma (marketing + výpočty fake brány). */

export type SubscriptionPlanKey = 'CUSTOMER' | 'TECHNICIAN' | 'COMPANY_ADMIN';

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanKey,
  { label: string; yearlyPriceCzk: number }
> = {
  CUSTOMER: { label: 'Zákazník', yearlyPriceCzk: 199 },
  TECHNICIAN: { label: 'Technik', yearlyPriceCzk: 899 },
  COMPANY_ADMIN: { label: 'Firma', yearlyPriceCzk: 1199 },
};

export function getSubscriptionPlanForRole(role: string): {
  label: string;
  yearlyPriceCzk: number;
} {
  if (role === 'TECHNICIAN') return SUBSCRIPTION_PLANS.TECHNICIAN;
  if (role === 'COMPANY_ADMIN') return SUBSCRIPTION_PLANS.COMPANY_ADMIN;
  return SUBSCRIPTION_PLANS.CUSTOMER;
}

export function addCalendarMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + Math.max(0, Math.min(120, months)));
  return d;
}

/** Konec bezplatného měsíce od okamžiku registrace. */
export function trialEndFromRegistration(registeredAt: Date): Date {
  return addCalendarMonths(registeredAt, 1);
}

/** Po uhrazení ročního předplatného: konec zkušební lhůty + 12 měsíců. */
export function licenseValidUntilAfterAnnualPay(trialEnd: Date): Date {
  return addCalendarMonths(trialEnd, 12);
}
