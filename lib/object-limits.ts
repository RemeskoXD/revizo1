/**
 * Limity počtu objektů (Property) na uživatele dle role.
 *
 * Zdroj pravdy: `docs/pricing-rules.md`.
 *
 *  - CUSTOMER: 1 v základu, každý další 100 Kč/rok (objectLimitExtraPaid)
 *  - SVJ:      3 v základu, balíček do 10 za 600 Kč/rok (objectPackagePaid)
 *              nad 10 individuální nabídka (objectLimitOverride)
 *  - COMPANY:  3 v základu, balíček do 10 za 600 Kč/rok (objectPackagePaid)
 *              nad 10 individuální nabídka (objectLimitOverride)
 *  - ostatní role:  bez limitu (REALTY portfolio, TECHNICIAN nemá objekty, ADMIN apod.)
 */

import { ROLES, type Role } from './constants';

export const OBJECT_PACKAGE_PRICE_CZK = 600;
export const OBJECT_EXTRA_PRICE_CZK = 100;
export const OBJECT_PACKAGE_LIMIT = 10;

/** Profily, na které se limit vůbec vztahuje. Ostatní role mají `Infinity`. */
const LIMITED_ROLES: ReadonlySet<string> = new Set([
  ROLES.CUSTOMER,
  ROLES.SVJ,
  ROLES.COMPANY_ADMIN,
]);

export function getRoleBaseLimit(role: string): number {
  if (role === ROLES.CUSTOMER) return 1;
  if (role === ROLES.SVJ) return 3;
  if (role === ROLES.COMPANY_ADMIN) return 3;
  return Number.POSITIVE_INFINITY;
}

export type ObjectLimitUser = {
  role: string;
  objectLimitBase?: number | null;
  objectLimitExtraPaid?: number | null;
  objectPackagePaid?: boolean | null;
  objectLimitOverride?: number | null;
};

/**
 * Spočítá maximální počet objektů (Property), které uživatel smí mít.
 *
 * Pravidla priority:
 *   1. `objectLimitOverride` (individuální nabídka adminem) má vždy přednost.
 *   2. Jinak base = `objectLimitBase` (pokud > 0) nebo z role.
 *   3. Pro CUSTOMER se přičte `objectLimitExtraPaid`.
 *   4. Pro SVJ/COMPANY se base zvedne na `OBJECT_PACKAGE_LIMIT` při `objectPackagePaid`.
 */
export function computeObjectLimit(user: ObjectLimitUser, options?: { packageLimit?: number }): number {
  if (!LIMITED_ROLES.has(user.role)) return Number.POSITIVE_INFINITY;

  if (typeof user.objectLimitOverride === 'number' && user.objectLimitOverride > 0) {
    return user.objectLimitOverride;
  }

  const base =
    typeof user.objectLimitBase === 'number' && user.objectLimitBase > 0
      ? user.objectLimitBase
      : getRoleBaseLimit(user.role);

  if (user.role === ROLES.CUSTOMER) {
    const extra = Math.max(0, user.objectLimitExtraPaid ?? 0);
    return base + extra;
  }

  if (user.role === ROLES.SVJ || user.role === ROLES.COMPANY_ADMIN) {
    if (user.objectPackagePaid) {
      return Math.max(base, options?.packageLimit ?? OBJECT_PACKAGE_LIMIT);
    }
    return base;
  }

  return base;
}

export type ObjectLimitStatus = {
  used: number;
  limit: number;
  remaining: number;
  /** Uživatel může přidat další objekt. */
  canAddMore: boolean;
  /** Lokalizovaná zpráva pro UI / API odpověď. */
  message: string;
  /** Návrh, co může uživatel udělat (zaplatit balíček / další objekt / kontakt obchodu). */
  upgradeHint:
    | { kind: 'NONE' }
    | { kind: 'CUSTOMER_EXTRA'; pricePerYearCzk: number }
    | { kind: 'PACKAGE_10'; pricePerYearCzk: number }
    | { kind: 'INDIVIDUAL' };
};

/**
 * Spočítá stav limitu (kolik objektů uživatel má, kolik smí, doporučené řešení).
 * `currentCount` typicky přijde z `prisma.property.count({ where: { ownerId } })`.
 */
export function getObjectLimitStatus(
  user: ObjectLimitUser,
  currentCount: number,
  prices?: { extraPrice?: number; packagePrice?: number; packageLimit?: number }
): ObjectLimitStatus {
  const limit = computeObjectLimit(user, { packageLimit: prices?.packageLimit });
  const used = Math.max(0, currentCount);
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - used);
  const canAddMore = used < limit;

  const currentExtraPrice = prices?.extraPrice ?? OBJECT_EXTRA_PRICE_CZK;
  const currentPackagePrice = prices?.packagePrice ?? OBJECT_PACKAGE_PRICE_CZK;
  const currentPackageLimit = prices?.packageLimit ?? OBJECT_PACKAGE_LIMIT;

  let upgradeHint: ObjectLimitStatus['upgradeHint'] = { kind: 'NONE' };
  let message = '';

  if (!canAddMore) {
    if (user.role === ROLES.CUSTOMER) {
      upgradeHint = { kind: 'CUSTOMER_EXTRA', pricePerYearCzk: currentExtraPrice };
      message = `Vyčerpali jste limit ${limit} objektů. Další objekt lze přidat za ${currentExtraPrice} Kč / rok.`;
    } else if (user.role === ROLES.SVJ || user.role === ROLES.COMPANY_ADMIN) {
      if (!user.objectPackagePaid && used >= getRoleBaseLimit(user.role)) {
        upgradeHint = { kind: 'PACKAGE_10', pricePerYearCzk: currentPackagePrice };
        message = `Vyčerpali jste základní limit ${limit} objektů. Aktivujte balíček do ${currentPackageLimit} objektů za ${currentPackagePrice} Kč / rok.`;
      } else {
        upgradeHint = { kind: 'INDIVIDUAL' };
        message = `Vyčerpali jste limit ${limit} objektů. Pro více objektů nás kontaktujte – připravíme individuální nabídku.`;
      }
    } else {
      message = `Vyčerpali jste limit ${limit} objektů.`;
    }
  } else {
    message =
      limit === Infinity
        ? 'Bez limitu objektů.'
        : `Využíváte ${used} z ${limit} objektů.`;
  }

  return { used, limit, remaining, canAddMore, message, upgradeHint };
}

/** Pomocný typ – povolené role (pro pozdější rozšiřování). */
export type LimitedRole = Extract<Role, 'CUSTOMER' | 'SVJ' | 'COMPANY_ADMIN'>;
