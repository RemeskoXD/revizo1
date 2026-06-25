/**
 * Access control – stav předplatného / licence uživatele.
 *
 * Použití:
 *   - V API routách: `assertActiveLicense(user)` – vyhodí `LicenseExpiredError`,
 *     který se v handleru přeloží na HTTP 402.
 *   - V UI: `GET /api/user/license-status` vrací stav pro banner.
 *
 * Viz docs/business-decisions.md sekce 2.2 a 2.3.
 */

import { ROLES } from './constants';

/** Role, které mají licenční model (předplatné). Ostatní (ADMIN, …) přístup nikdy nelosí. */
const LICENSED_ROLES: ReadonlySet<string> = new Set([
  ROLES.CUSTOMER,
]);

export type LicenseUser = {
  role: string;
  licenseValidUntil?: Date | string | null;
  /** TRUE = uživatel se má dostat na úvodní checkout (po registraci / schválení). */
  requiresSubscriptionCheckout?: boolean | null;
};

export type LicenseStatus = {
  /** Role uživatele */
  role: string;
  /** Licence je aktivní (= povoleno vytvářet revize / stahovat PDF). */
  active: boolean;
  /** Datum konce platnosti licence (může být null pro role bez licence). */
  validUntil: Date | null;
  /** Dní zbývající do konce platnosti. < 0 znamená vypršela. */
  daysLeft: number | null;
  /**
   * Stav:
   *   - 'NO_LIMIT'   = role bez licenčního modelu (ADMIN apod.)
   *   - 'NEVER_PAID' = licenseValidUntil je null (čerstvý účet)
   *   - 'ACTIVE'     = licence platí
   *   - 'EXPIRES_SOON' = aktivní, ale do 7 dní expiruje
   *   - 'EXPIRED'    = licence vypršela
   */
  state: 'NO_LIMIT' | 'NEVER_PAID' | 'ACTIVE' | 'EXPIRES_SOON' | 'EXPIRED';
  /** Lokalizovaná zpráva pro UI banner / chybu. */
  message: string;
};

/**
 * Spočte stav licence. Tato funkce je čistá – žádná DB / Stripe komunikace.
 */
export function getLicenseStatus(user: LicenseUser, now: Date = new Date()): LicenseStatus {
  if (!LICENSED_ROLES.has(user.role)) {
    return {
      role: user.role,
      active: true,
      validUntil: null,
      daysLeft: null,
      state: 'NO_LIMIT',
      message: 'Tato role nemá licenční omezení.',
    };
  }

  if (user.licenseValidUntil == null) {
    return {
      role: user.role,
      active: false,
      validUntil: null,
      daysLeft: null,
      state: 'NEVER_PAID',
      message:
        'Účet ještě nemá aktivní předplatné. Pro využití této funkce dokončete platbu.',
    };
  }

  const validUntil =
    user.licenseValidUntil instanceof Date
      ? user.licenseValidUntil
      : new Date(user.licenseValidUntil);
  if (Number.isNaN(validUntil.getTime())) {
    return {
      role: user.role,
      active: false,
      validUntil: null,
      daysLeft: null,
      state: 'NEVER_PAID',
      message: 'Neplatné datum licence – kontaktujte podporu.',
    };
  }

  const msDay = 24 * 60 * 60 * 1000;
  const diff = validUntil.getTime() - now.getTime();
  const daysLeft = Math.ceil(diff / msDay);

  if (diff <= 0) {
    return {
      role: user.role,
      active: false,
      validUntil,
      daysLeft,
      state: 'EXPIRED',
      message: `Platnost vašeho předplatného vypršela ${validUntil.toLocaleDateString('cs-CZ')}.`,
    };
  }
  if (daysLeft <= 7) {
    return {
      role: user.role,
      active: true,
      validUntil,
      daysLeft,
      state: 'EXPIRES_SOON',
      message: `Vaše předplatné vyprší za ${daysLeft} ${daysLeft === 1 ? 'den' : 'dní'}.`,
    };
  }
  return {
    role: user.role,
    active: true,
    validUntil,
    daysLeft,
    state: 'ACTIVE',
    message: `Předplatné aktivní do ${validUntil.toLocaleDateString('cs-CZ')}.`,
  };
}

export function hasActiveLicense(user: LicenseUser, now: Date = new Date()): boolean {
  return getLicenseStatus(user, now).active;
}

export class LicenseExpiredError extends Error {
  status: LicenseStatus;
  constructor(status: LicenseStatus) {
    super(status.message);
    this.name = 'LicenseExpiredError';
    this.status = status;
  }
}

/**
 * Hodí `LicenseExpiredError`, pokud uživatel nemá aktivní licenci.
 * V API routě se hodí zachytit a vrátit 402 Payment Required.
 */
export function assertActiveLicense(user: LicenseUser): void {
  const status = getLicenseStatus(user);
  if (!status.active) {
    throw new LicenseExpiredError(status);
  }
}
