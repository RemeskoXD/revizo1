import { describe, it, expect } from 'vitest';
import {
  computeBillableTechs,
  computeMonthlyCostCzk,
  computeYearlyCostCzk,
  getCompanyTechBillingStatus,
  TECH_SEAT_MONTHLY_CZK,
  TECH_FREE_TECHS,
} from '../lib/company-pricing';

describe('computeBillableTechs', () => {
  it('0 techniků = 0 placených', () => {
    expect(computeBillableTechs(0)).toBe(0);
  });

  it('1 technik = 0 placených (zdarma)', () => {
    expect(computeBillableTechs(1)).toBe(0);
  });

  it('3 technici = 0 placených (zdarma)', () => {
    expect(computeBillableTechs(3)).toBe(0);
  });

  it('4 technici = 1 placený', () => {
    expect(computeBillableTechs(4)).toBe(1);
  });

  it('10 techniků = 7 placených (3 zdarma)', () => {
    expect(computeBillableTechs(10)).toBe(7);
  });

  it('záporný počet vrátí 0', () => {
    expect(computeBillableTechs(-5)).toBe(0);
  });

  it('NaN vrátí 0', () => {
    expect(computeBillableTechs(Number.NaN)).toBe(0);
  });

  it('desetinný počet zaokrouhlí dolů', () => {
    expect(computeBillableTechs(4.7)).toBe(1);
  });
});

describe('computeMonthlyCostCzk', () => {
  it('odpovídá počtu billable seats × 200', () => {
    expect(computeMonthlyCostCzk(0)).toBe(0);
    expect(computeMonthlyCostCzk(3)).toBe(0);
    expect(computeMonthlyCostCzk(4)).toBe(200);
    expect(computeMonthlyCostCzk(10)).toBe(1400);
  });
});

describe('computeYearlyCostCzk', () => {
  it('je 12× měsíční', () => {
    expect(computeYearlyCostCzk(10)).toBe(12 * 1400);
  });
});

describe('getCompanyTechBillingStatus', () => {
  it('vrátí kompletní status pro 10 techniků s aktivním subscription', () => {
    const s = getCompanyTechBillingStatus({ techCount: 10, subscriptionActive: true });
    expect(s).toEqual({
      techCount: 10,
      billable: 7,
      freeTechs: 3,
      monthlyCzk: 1400,
      yearlyCzk: 16800,
      subscriptionActive: true,
    });
  });

  it('vrátí status pro 0 techniků', () => {
    const s = getCompanyTechBillingStatus({ techCount: 0, subscriptionActive: false });
    expect(s.techCount).toBe(0);
    expect(s.billable).toBe(0);
    expect(s.monthlyCzk).toBe(0);
    expect(s.subscriptionActive).toBe(false);
  });
});

describe('konstanty odpovídají zadání', () => {
  it('TECH_SEAT_MONTHLY_CZK = 200', () => {
    expect(TECH_SEAT_MONTHLY_CZK).toBe(200);
  });
  it('TECH_FREE_TECHS = 3', () => {
    expect(TECH_FREE_TECHS).toBe(3);
  });
});
