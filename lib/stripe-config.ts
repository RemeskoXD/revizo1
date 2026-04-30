/**
 * Veřejná URL aplikace (redirecty Stripe Checkout / Customer Portal).
 * Nastavte NEXTAUTH_URL v produkci (např. https://vase-domena.cz).
 */
export function getAppBaseUrl(): string {
  const u = process.env.NEXTAUTH_URL?.trim();
  if (u) return u.replace(/\/$/, '');
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/\/$/, '')}`;
  return 'http://localhost:3000';
}

/** Měsíce platnosti licence po každé úspěšné faktuře předplatného (default 1 = měsíční ceník). */
export function getStripeLicensePeriodMonths(): number {
  const n = parseInt(process.env.STRIPE_LICENSE_PERIOD_MONTHS || '1', 10);
  if (!Number.isFinite(n) || n < 1 || n > 120) return 1;
  return n;
}

export function isStripePaymentsConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_PRICE_ID?.trim());
}

/**
 * Testovací platební brána (stránka /platba-test) místo Stripe Checkout / portálu.
 * Nastavte `FAKE_PAYMENT_GATEWAY=1` nebo `true` (jen vývoj / staging – ne na ostré produkci bez rozmyslu).
 */
export function isFakePaymentGatewayEnabled(): boolean {
  const v = process.env.FAKE_PAYMENT_GATEWAY?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Checkout / tlačítka „předplatit“ – skutečný Stripe nebo fake režim. */
export function isCheckoutAvailable(): boolean {
  return isStripePaymentsConfigured() || isFakePaymentGatewayEnabled();
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

/** Povolené cesty pro návrat z Stripe Checkout / Customer Portal (stejné jako stránky s SettingsClient). */
const STRIPE_SETTINGS_RETURN_PATHS = new Set([
  '/dashboard/settings',
  '/company/settings',
  '/realty/settings',
  '/svj/settings',
]);

/**
 * Bezpečně vybere path pro success/cancel/return URL. Neznámé nebo nebezpečné hodnoty → /dashboard/settings.
 */
export function resolveStripeSettingsReturnPath(raw: unknown): string {
  if (typeof raw !== 'string') return '/dashboard/settings';
  const pathOnly = raw.trim().split('?')[0] ?? '';
  if (!pathOnly.startsWith('/') || pathOnly.includes('//')) return '/dashboard/settings';
  return STRIPE_SETTINGS_RETURN_PATHS.has(pathOnly) ? pathOnly : '/dashboard/settings';
}

/** URL testovací brány pro povinné dokončení předplatného po registraci / schválení. */
export function buildPlatbaTestOnboardingUrl(returnPath: string): string {
  const pathOnly = returnPath.trim().split('?')[0] || '/dashboard/settings';
  const safe = STRIPE_SETTINGS_RETURN_PATHS.has(pathOnly) ? pathOnly : '/dashboard/settings';
  const rp = encodeURIComponent(safe);
  return `/platba-test?rp=${rp}&m=checkout&purpose=onboarding`;
}
