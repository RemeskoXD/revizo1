/** Roční předplatné po 1 měsíci zdarma (marketing + výpočty fake brány). */

export type SubscriptionPlanKey = 'CUSTOMER' | 'TECHNICIAN' | 'COMPANY_ADMIN' | 'SVJ' | 'REALTY';

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanKey,
  { label: string; yearlyPriceCzk: number; stripePriceId: string }
> = {
  CUSTOMER: { label: 'Zákazník', yearlyPriceCzk: 199, stripePriceId: 'price_1TRxwALtyGxFBhS8q8DqepQ9' },
  TECHNICIAN: { label: 'Technik', yearlyPriceCzk: 899, stripePriceId: 'price_1TRyMhLtyGxFBhS8Eo71vv3V' },
  COMPANY_ADMIN: { label: 'Firma / Revizní společnost', yearlyPriceCzk: 1199, stripePriceId: 'price_1TRyN2LtyGxFBhS8Io9Mnq3k' },
  SVJ: { label: 'Správce SVJ / Bytové domy', yearlyPriceCzk: 799, stripePriceId: 'price_1TRyNaLtyGxFBhS85AGMIiJl' },
  REALTY: { label: 'Realitní makléř / Kancelář', yearlyPriceCzk: 699, stripePriceId: 'price_1TRyNzLtyGxFBhS8gKCP5MBJ' },
};

export function getSubscriptionPlanForRole(role: string): {
  label: string;
  yearlyPriceCzk: number;
  stripePriceId: string;
} {
  if (role === 'TECHNICIAN') return SUBSCRIPTION_PLANS.TECHNICIAN;
  if (role === 'COMPANY_ADMIN') return SUBSCRIPTION_PLANS.COMPANY_ADMIN;
  if (role === 'SVJ') return SUBSCRIPTION_PLANS.SVJ;
  if (role === 'REALTY') return SUBSCRIPTION_PLANS.REALTY;
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
