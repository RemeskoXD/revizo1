import { describe, it, expect } from 'vitest';
import {
  computeBillableTechs,
  computeMonthlyCostCzk,
  computeYearlyCostCzk,
  getCompanyTechBillingStatus,
  TECH_SEAT_MONTHLY_CZK,
  TECH_FREE_PER_N,
} from '../lib/company-pricing';

describe('computeBillableTechs', () => {
  it('0 techniků = 0 placených', () => {
    expect(computeBillableTechs(0)).toBe(0);
  });

  it('1 technik = 1 placený', () => {
    expect(computeBillableTechs(1)).toBe(1);
  });

  it('9 techniků = 9 placených', () => {
    expect(computeBillableTechs(9)).toBe(9);
  });

  it('10 techniků = 9 placených (1 zdarma)', () => {
    expect(computeBillableTechs(10)).toBe(9);
  });

  it('15 techniků = 14 placených (1 zdarma)', () => {
    expect(computeBillableTechs(15)).toBe(14);
  });

  it('20 techniků = 18 placených (2 zdarma)', () => {
    expect(computeBillableTechs(20)).toBe(18);
  });

  it('100 techniků = 90 placených (10 zdarma)', () => {
    expect(computeBillableTechs(100)).toBe(90);
  });

  it('záporný počet vrátí 0', () => {
    expect(computeBillableTechs(-5)).toBe(0);
  });

  it('NaN vrátí 0', () => {
    expect(computeBillableTechs(Number.NaN)).toBe(0);
  });

  it('desetinný počet zaokrouhlí dolů', () => {
    expect(computeBillableTechs(15.7)).toBe(14);
  });
});

describe('computeMonthlyCostCzk', () => {
  it('odpovídá počtu billable seats × 200', () => {
    expect(computeMonthlyCostCzk(0)).toBe(0);
    expect(computeMonthlyCostCzk(1)).toBe(200);
    expect(computeMonthlyCostCzk(9)).toBe(1800);
    expect(computeMonthlyCostCzk(10)).toBe(1800);
    expect(computeMonthlyCostCzk(15)).toBe(2800);
    expect(computeMonthlyCostCzk(20)).toBe(3600);
  });
});

describe('computeYearlyCostCzk', () => {
  it('je 12× měsíční', () => {
    expect(computeYearlyCostCzk(10)).toBe(12 * 1800);
  });
});

describe('getCompanyTechBillingStatus', () => {
  it('vrátí kompletní status pro 15 techniků s aktivním subscription', () => {
    const s = getCompanyTechBillingStatus({ techCount: 15, subscriptionActive: true });
    expect(s).toEqual({
      techCount: 15,
      billable: 14,
      freeTechs: 1,
      monthlyCzk: 2800,
      yearlyCzk: 33600,
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

describe('konstanty odpovídají diagramu', () => {
  it('TECH_SEAT_MONTHLY_CZK = 200', () => {
    expect(TECH_SEAT_MONTHLY_CZK).toBe(200);
  });
  it('TECH_FREE_PER_N = 10', () => {
    expect(TECH_FREE_PER_N).toBe(10);
  });
});
