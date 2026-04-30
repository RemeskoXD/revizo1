type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const MAX_KEYS = 20_000;

function prune(now: number) {
  if (store.size <= MAX_KEYS) return;
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k);
  }
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim().slice(0, 45);
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 45);
  return "unknown";
}

/** Simple fixed-window counter (best-effort; use a reverse proxy for strict limits). */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  prune(now);
  let b = store.get(key);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    store.set(key, b);
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}
