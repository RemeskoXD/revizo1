/** Roční předplatné po 1 měsíci zdarma (marketing + výpočty fake brány). */

export type SubscriptionPlanKey = 'CUSTOMER' | 'TECHNICIAN' | 'COMPANY_ADMIN' | 'SVJ' | 'REALTY';

export const SUBSCRIPTION_PLANS: Record<
  SubscriptionPlanKey,
  { label: string; yearlyPriceCzk: number; stripePriceId: string }
> = {
  // Pozn.: Ceny vychází z architektonického diagramu z 18. 5. 2026 (viz docs/pricing-rules.md).
  // Stripe Price ID je nutné aktualizovat v Dashboardu Stripe na novou cenu.
  CUSTOMER: { label: 'Zákazník', yearlyPriceCzk: 199, stripePriceId: 'price_1TRxwALtyGxFBhS8q8DqepQ9' },
  TECHNICIAN: { label: 'Revizní technik', yearlyPriceCzk: 899, stripePriceId: 'price_1TRyMhLtyGxFBhS8Eo71vv3V' },
  COMPANY_ADMIN: { label: 'Pracujeme v týmu', yearlyPriceCzk: 4999, stripePriceId: 'price_1TRyN2LtyGxFBhS8Io9Mnq3k' },
  SVJ: { label: 'Správce SVJ / Bytové domy', yearlyPriceCzk: 1199, stripePriceId: 'price_1TRyNaLtyGxFBhS85AGMIiJl' },
  REALTY: { label: 'Realitní makléř / Kancelář', yearlyPriceCzk: 0, stripePriceId: 'price_1TRyNzLtyGxFBhS8gKCP5MBJ' },
};

/**
 * Doplňkové ceny za rozšíření počtu objektů (Property) nad rámec základu.
 * Viz `docs/pricing-rules.md`. ID Stripe cen doplňte v Dashboardu Stripe;
 * do té doby fungují texty/UI podle ceny v Kč.
 */
export type ObjectAddonKey = 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS';

export const OBJECT_ADDONS: Record<
  ObjectAddonKey,
  { label: string; yearlyPriceCzk: number; stripePriceId: string }
> = {
  CUSTOMER_EXTRA_OBJECT: {
    label: 'Další objekt (zákazník)',
    yearlyPriceCzk: 100,
    stripePriceId: process.env.STRIPE_PRICE_CUSTOMER_EXTRA_OBJECT || '',
  },
  PACKAGE_10_OBJECTS: {
    label: 'Balíček do 10 objektů (SVJ / firma)',
    yearlyPriceCzk: 600,
    stripePriceId: process.env.STRIPE_PRICE_PACKAGE_10_OBJECTS || '',
  },
};

/**
 * Firemní billing techniků (200 Kč / měsíc / billable seat).
 * Viz `lib/company-pricing.ts`.
 */
export const COMPANY_TECH_SEAT_STRIPE_PRICE_ID = process.env.STRIPE_PRICE_COMPANY_TECH_SEAT || '';

/**
 * Poplatek 200 Kč makléři za převod nemovitosti přes invite kód.
 * Po 30 dnech aktivity nového vlastníka se makléři vrátí 20 Kč jako bonus.
 * Viz docs/business-decisions.md sekce 2.4.
 */
export const REALTY_TRANSFER_FEE_CZK = 200;
export const REALTY_TRANSFER_REBATE_CZK = 20;
export const REALTY_TRANSFER_REBATE_DAYS = 30;
export const STRIPE_PRICE_REALTY_TRANSFER_FEE = process.env.STRIPE_PRICE_REALTY_TRANSFER_FEE || '';

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
