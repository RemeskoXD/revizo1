const REVISION_AUTH_ROLES = new Set(['TECHNICIAN', 'COMPANY_ADMIN']);

/** Datum z inputu typu YYYY-MM-DD – platnost včetně celého dne (UTC konec dne). */
export function parseRevisionAuthValidUntilDate(isoDate: string): Date | null {
  const t = isoDate.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d, 23, 59, 59, 999));
}

/** Zda platnost oprávnění k revizím vypršela (pouze technik/firma; null = dosud neomezeno / legacy). */
export function isRevisionAuthExpired(
  role: string,
  revisionAuthValidUntil: Date | null | undefined
): boolean {
  if (!REVISION_AUTH_ROLES.has(role)) return false;
  if (revisionAuthValidUntil == null) return false;
  return revisionAuthValidUntil.getTime() < Date.now();
}

export function isRevisionAuthRole(role: string): boolean {
  return REVISION_AUTH_ROLES.has(role);
}
