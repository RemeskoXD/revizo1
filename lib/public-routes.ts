/**
 * Prefixy URL, které projdou middlewarem bez přihlášení (nebudou přesměrovány na /login).
 * Důležité zejména pro právní stránky (Google Play) a veřejné formuláře.
 */
export const PUBLIC_ROUTE_PREFIXES = [
  '/login',
  '/register',
  '/registertest',
  '/success',
  '/new-order',
  '/claim-property',
  '/share',
  '/test',
  /** Obchodní podmínky a GDPR – musí být dostupné bez účtu */
  '/obchodnipodminky',
  /** Smazání účtu (požadavek Google Play) – veřejný text + přihlášení až ve formuláři */
  '/smazatucet',
  '/api/public',
  '/api/register',
  '/api/auth',
  '/api/banner',
  '/api/revisions',
  '/api/health',
  /** Stripe webhook – ověření podpisu STRIPE_WEBHOOK_SECRET */
  '/api/webhooks/stripe',
] as const;

function stripTrailingSlash(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** True = middleware nepřesměruje na /login (kromě kořene `/`, který řeší volající). */
export function isPublicPathname(pathname: string): boolean {
  const p = stripTrailingSlash(pathname);
  return PUBLIC_ROUTE_PREFIXES.some((route) => p === route || p.startsWith(`${route}/`));
}
