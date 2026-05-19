'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, X as XIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

type LicenseStatus = {
  state: 'NO_LIMIT' | 'NEVER_PAID' | 'ACTIVE' | 'EXPIRES_SOON' | 'EXPIRED';
  active: boolean;
  daysLeft: number | null;
  validUntil: string | null;
  message: string;
  requiresSubscriptionCheckout: boolean;
};

const DISMISS_KEY = 'revizone:license-banner:dismissed-soon';

/**
 * Banner s upozorněním o stavu licence:
 *   - EXPIRED  → červený banner, nelze skrýt
 *   - NEVER_PAID → oranžový banner s odkazem na checkout
 *   - EXPIRES_SOON (≤ 7 dní) → oranžový banner, dá se skrýt na 24h
 *   - ACTIVE / NO_LIMIT → nezobrazuje se
 *
 * Použít v layoutu nad PageTransition.
 */
export function LicenseBanner({ returnPath }: { returnPath?: string }) {
  const [status, setStatus] = useState<LicenseStatus | null>(null);
  const [paying, setPaying] = useState(false);
  const [dismissedSoon, setDismissedSoon] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ts = window.localStorage.getItem(DISMISS_KEY);
    if (ts && Date.now() - parseInt(ts, 10) < 24 * 60 * 60 * 1000) {
      setDismissedSoon(true);
    }
  }, []);

  useEffect(() => {
    fetch('/api/user/license-status', { cache: 'no-store' })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((d: LicenseStatus | null) => setStatus(d))
      .catch(() => setStatus(null));
  }, []);

  const startCheckout = async () => {
    setPaying(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: returnPath || '/dashboard' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.url === 'string') {
        window.location.href = data.url;
        return;
      }
      toast.error(data?.message || 'Nepodařilo se spustit platbu');
    } catch {
      toast.error('Nepodařilo se spustit platbu');
    } finally {
      setPaying(false);
    }
  };

  if (!status) return null;
  if (status.state === 'NO_LIMIT' || status.state === 'ACTIVE') return null;

  // EXPIRES_SOON může skrýt na 24h
  if (status.state === 'EXPIRES_SOON' && dismissedSoon) return null;

  const isHardBlock = status.state === 'EXPIRED' || status.state === 'NEVER_PAID';
  const colorClass = isHardBlock
    ? 'border-red-500/30 bg-red-500/10 text-red-200'
    : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  const Icon = isHardBlock ? AlertTriangle : Clock;

  const dismissSoon = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissedSoon(true);
  };

  return (
    <div className={`flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center ${colorClass}`}>
      <Icon className="h-5 w-5 shrink-0" />
      <div className="flex-1 text-sm font-medium">
        {status.message}
        {isHardBlock && (
          <span className="ml-2 text-xs opacity-80">
            Pro vytvoření revize / stažení dokumentu uhraďte předplatné.
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void startCheckout()}
          disabled={paying}
          className="rounded-lg bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
        >
          {paying ? 'Načítám…' : isHardBlock ? 'Uhradit předplatné' : 'Obnovit'}
        </button>
        <Link
          href="/dashboard/settings?tab=billing"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/5"
        >
          Detail
        </Link>
        {status.state === 'EXPIRES_SOON' && (
          <button
            type="button"
            onClick={dismissSoon}
            className="rounded-md p-1 text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Skrýt na 24h"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
