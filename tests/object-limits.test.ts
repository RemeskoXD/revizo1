import { describe, it, expect } from 'vitest';
import {
  computeObjectLimit,
  getObjectLimitStatus,
  getRoleBaseLimit,
  OBJECT_EXTRA_PRICE_CZK,
  OBJECT_PACKAGE_PRICE_CZK,
  OBJECT_PACKAGE_LIMIT,
} from '../lib/object-limits';

describe('getRoleBaseLimit', () => {
  it('vrací správné default hodnoty dle role', () => {
    expect(getRoleBaseLimit('CUSTOMER')).toBe(1);
    expect(getRoleBaseLimit('SVJ')).toBe(3);
    expect(getRoleBaseLimit('COMPANY_ADMIN')).toBe(3);
  });

  it('pro neomezené role vrací Infinity', () => {
    expect(getRoleBaseLimit('TECHNICIAN')).toBe(Number.POSITIVE_INFINITY);
    expect(getRoleBaseLimit('REALTY')).toBe(Number.POSITIVE_INFINITY);
    expect(getRoleBaseLimit('ADMIN')).toBe(Number.POSITIVE_INFINITY);
    expect(getRoleBaseLimit('SUPPORT')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('computeObjectLimit', () => {
  it('CUSTOMER bez doplňků = 1', () => {
    expect(
      computeObjectLimit({ role: 'CUSTOMER', objectLimitExtraPaid: 0, objectPackagePaid: false }),
    ).toBe(1);
  });

  it('CUSTOMER se 3 zaplacenými dalšími objekty = 4', () => {
    expect(
      computeObjectLimit({ role: 'CUSTOMER', objectLimitExtraPaid: 3 }),
    ).toBe(4);
  });

  it('SVJ bez balíčku = 3', () => {
    expect(computeObjectLimit({ role: 'SVJ', objectPackagePaid: false })).toBe(3);
  });

  it('SVJ s balíčkem = OBJECT_PACKAGE_LIMIT (10)', () => {
    expect(computeObjectLimit({ role: 'SVJ', objectPackagePaid: true })).toBe(
      OBJECT_PACKAGE_LIMIT,
    );
  });

  it('COMPANY_ADMIN s balíčkem = 10', () => {
    expect(
      computeObjectLimit({ role: 'COMPANY_ADMIN', objectPackagePaid: true }),
    ).toBe(10);
  });

  it('Override má vždy přednost', () => {
    expect(
      computeObjectLimit({
        role: 'SVJ',
        objectPackagePaid: true,
        objectLimitOverride: 25,
      }),
    ).toBe(25);
  });

  it('Vlastní objectLimitBase přepíše default', () => {
    expect(
      computeObjectLimit({
        role: 'SVJ',
        objectLimitBase: 5,
        objectPackagePaid: false,
      }),
    ).toBe(5);
  });

  it('Pro role bez limitu vrací Infinity', () => {
    expect(computeObjectLimit({ role: 'TECHNICIAN' })).toBe(Number.POSITIVE_INFINITY);
    expect(computeObjectLimit({ role: 'REALTY' })).toBe(Number.POSITIVE_INFINITY);
    expect(computeObjectLimit({ role: 'ADMIN' })).toBe(Number.POSITIVE_INFINITY);
  });

  it('Záporný objectLimitExtraPaid se ignoruje', () => {
    expect(
      computeObjectLimit({ role: 'CUSTOMER', objectLimitExtraPaid: -5 }),
    ).toBe(1);
  });
});

describe('getObjectLimitStatus', () => {
  it('CUSTOMER s 0 objekty může přidat', () => {
    const s = getObjectLimitStatus({ role: 'CUSTOMER' }, 0);
    expect(s.used).toBe(0);
    expect(s.limit).toBe(1);
    expect(s.remaining).toBe(1);
    expect(s.canAddMore).toBe(true);
    expect(s.upgradeHint.kind).toBe('NONE');
  });

  it('CUSTOMER s vyčerpaným limitem doporučí 100 Kč', () => {
    const s = getObjectLimitStatus({ role: 'CUSTOMER' }, 1);
    expect(s.canAddMore).toBe(false);
    expect(s.upgradeHint).toEqual({
      kind: 'CUSTOMER_EXTRA',
      pricePerYearCzk: OBJECT_EXTRA_PRICE_CZK,
    });
    expect(s.message).toContain('100');
  });

  it('SVJ s 3 objekty doporučí balíček 600 Kč', () => {
    const s = getObjectLimitStatus({ role: 'SVJ' }, 3);
    expect(s.canAddMore).toBe(false);
    expect(s.upgradeHint).toEqual({
      kind: 'PACKAGE_10',
      pricePerYearCzk: OBJECT_PACKAGE_PRICE_CZK,
    });
  });

  it('SVJ s 10 objekty (po balíčku) doporučí individuální', () => {
    const s = getObjectLimitStatus(
      { role: 'SVJ', objectPackagePaid: true },
      10,
    );
    expect(s.canAddMore).toBe(false);
    expect(s.upgradeHint).toEqual({ kind: 'INDIVIDUAL' });
  });

  it('TECHNICIAN má neomezený limit', () => {
    const s = getObjectLimitStatus({ role: 'TECHNICIAN' }, 1000);
    expect(s.limit).toBe(Number.POSITIVE_INFINITY);
    expect(s.canAddMore).toBe(true);
    expect(s.message).toBe('Bez limitu objektů.');
  });
});
