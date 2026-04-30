/**
 * Single source for NextAuth JWT signing / verification.
 * Production: set NEXTAUTH_SECRET to a long random value (min. 24 znaků, doporučeno 32+).
 */
const LOCAL_DEV_ONLY =
  "LOCAL_DEV_NEXTAUTH_SECRET_DO_NOT_USE_IN_PRODUCTION_MIN_32_CHARS";

export function getNextAuthJwtSecret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV !== "production") return LOCAL_DEV_ONLY;
  return "";
}

export function isProductionAuthMisconfigured(): boolean {
  const s = process.env.NEXTAUTH_SECRET;
  return (
    process.env.NODE_ENV === "production" &&
    (!s || s.length < 24)
  );
}
