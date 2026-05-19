/**
 * Cenotvorba pro firemní účet (`COMPANY_ADMIN`) – billing techniků.
 *
 * Pravidla z diagramu (viz docs/pricing-rules.md, sekce 4a):
 *   - 200 Kč / měsíc za každého technika ve skupině
 *   - Každý 10. technik zdarma (sleva)
 *
 * Formule:
 *   billableTechs(n) = n - floor(n / FREE_PER_N)
 *   monthlyCostCzk(n) = billableTechs(n) * SEAT_MONTHLY_CZK
 */

export const TECH_SEAT_MONTHLY_CZK = 200;
export const TECH_FREE_PER_N = 10;

/**
 * Počet techniků, kteří se účtují (po odečtení zlevněných „každý N. zdarma“).
 *  - 0 techniků → 0 placených
 *  - 9 techniků → 9 placených
 *  - 10 techniků → 9 placených (1 zdarma)
 *  - 15 techniků → 14 placených (1 zdarma)
 *  - 20 techniků → 18 placených (2 zdarma)
 */
export function computeBillableTechs(techCount: number): number {
  if (!Number.isFinite(techCount) || techCount <= 0) return 0;
  const n = Math.floor(techCount);
  return Math.max(0, n - Math.floor(n / TECH_FREE_PER_N));
}

/** Měsíční fakturace za techniky (v Kč). */
export function computeMonthlyCostCzk(techCount: number): number {
  return computeBillableTechs(techCount) * TECH_SEAT_MONTHLY_CZK;
}

/** Roční ekvivalent měsíční fakturace (pro orientační výpočty). */
export function computeYearlyCostCzk(techCount: number): number {
  return computeMonthlyCostCzk(techCount) * 12;
}

export type CompanyTechBillingStatus = {
  /** Aktivní počet techniků pod firmou (User where companyId = company.id). */
  techCount: number;
  /** Počet techniků, kteří se účtují (po slevě „každý N. zdarma“). */
  billable: number;
  /** Počet techniků „zdarma“ (uplatněná sleva). */
  freeTechs: number;
  /** Měsíční částka v Kč. */
  monthlyCzk: number;
  /** Roční ekvivalent v Kč. */
  yearlyCzk: number;
  /** TRUE = firma má aktivní měsíční subscription u Stripe pro tento billing. */
  subscriptionActive: boolean;
};

export function getCompanyTechBillingStatus(params: {
  techCount: number;
  subscriptionActive: boolean;
}): CompanyTechBillingStatus {
  const techCount = Math.max(0, Math.floor(params.techCount));
  const billable = computeBillableTechs(techCount);
  return {
    techCount,
    billable,
    freeTechs: techCount - billable,
    monthlyCzk: billable * TECH_SEAT_MONTHLY_CZK,
    yearlyCzk: billable * TECH_SEAT_MONTHLY_CZK * 12,
    subscriptionActive: Boolean(params.subscriptionActive),
  };
}
