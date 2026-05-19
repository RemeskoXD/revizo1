'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Phone,
  AlertCircle,
  CheckCircle2,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type UpgradeHint =
  | { kind: 'NONE' }
  | { kind: 'CUSTOMER_EXTRA'; pricePerYearCzk: number }
  | { kind: 'PACKAGE_10'; pricePerYearCzk: number }
  | { kind: 'INDIVIDUAL' };

type ObjectLimitResponse = {
  role: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  canAddMore: boolean;
  message: string;
  upgradeHint: UpgradeHint;
  flags: {
    objectPackagePaid: boolean;
    objectLimitExtraPaid: number;
    hasOverride: boolean;
  };
  rules: {
    roleBase: number | null;
    extraPricePerYearCzk: number;
    packagePricePerYearCzk: number;
    packageLimit: number;
  };
};

/**
 * Karta s přehledem využití objektů a tlačítkem na rozšíření.
 * Použít na /dashboard, /svj a /company.
 *
 * Endpoint: GET /api/user/object-limit
 * Checkout: POST /api/stripe/checkout/addon
 */
export function ObjectLimitCard({
  returnPath,
  className,
}: {
  /** Stránka, na kterou se má uživatel vrátit ze Stripe Checkout. */
  returnPath: string;
  className?: string;
}) {
  const [data, setData] = useState<ObjectLimitResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/user/object-limit', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: ObjectLimitResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startAddonCheckout = useCallback(
    async (kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS', quantity?: number) => {
      setPaying(true);
      try {
        const res = await fetch('/api/stripe/checkout/addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind, quantity, returnPath }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok && typeof json.url === 'string') {
          window.location.href = json.url;
          return;
        }
        toast.error(json.message || 'Nepodařilo se spustit platbu.');
      } catch {
        toast.error('Nepodařilo se spustit platbu.');
      } finally {
        setPaying(false);
      }
    },
    [returnPath],
  );

  const mutateAddon = useCallback(
    async (params: {
      kind: 'CUSTOMER_EXTRA_OBJECT' | 'PACKAGE_10_OBJECTS';
      action: 'SET_QUANTITY' | 'CANCEL';
      quantity?: number;
      confirmText?: string;
      successText: string;
    }) => {
      if (params.confirmText && !window.confirm(params.confirmText)) return;
      setMutating(true);
      try {
        const res = await fetch('/api/stripe/subscriptions/addon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: params.kind,
            action: params.action,
            quantity: params.quantity,
          }),
        });
        const json = await res.json().catch(() => ({}));
        if (res.ok) {
          toast.success(params.successText);
          load();
        } else {
          toast.error(json.message || 'Nepodařilo se provést změnu.');
        }
      } catch {
        toast.error('Nepodařilo se provést změnu.');
      } finally {
        setMutating(false);
      }
    },
    [load],
  );

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 ${className ?? ''}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-brand-yellow" />
      </div>
    );
  }

  if (!data || data.limit === null) {
    // Role bez limitu (REALTY, TECHNICIAN, ADMIN, …) – kartu nezobrazujeme.
    return null;
  }

  const { used, limit, canAddMore, upgradeHint, flags, rules, role } = data;
  const ratio = limit > 0 ? Math.min(1, used / limit) : 0;
  const pct = Math.round(ratio * 100);
  const nearLimit = ratio >= 0.8;

  const barColor = !canAddMore
    ? 'bg-red-500'
    : nearLimit
      ? 'bg-amber-400'
      : 'bg-emerald-400';

  const title = `Objekty: ${used} / ${limit}`;
  const sub = flags.hasOverride
    ? 'Individuální nabídka'
    : role === 'CUSTOMER'
      ? `${rules.roleBase ?? 1} v základu${
          flags.objectLimitExtraPaid > 0 ? ` + ${flags.objectLimitExtraPaid} zaplacených` : ''
        }`
      : `${rules.roleBase ?? 3} v základu${flags.objectPackagePaid ? ` + balíček do ${rules.packageLimit}` : ''}`;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6 ${className ?? ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Building className="h-4 w-4" />
            <span>Využití objektů</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-gray-500">{sub}</p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            canAddMore ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {canAddMore ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 text-xs text-gray-500">{pct} % obsazeno</p>
      </div>

      {upgradeHint.kind !== 'NONE' && (
        <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4">
          {upgradeHint.kind === 'PACKAGE_10' && (
            <>
              <p className="text-sm text-gray-300">
                Pokud potřebujete více objektů, aktivujte balíček do
                <strong className="text-white"> {rules.packageLimit} objektů</strong> za
                <strong className="text-white"> {upgradeHint.pricePerYearCzk} Kč / rok</strong>.
              </p>
              <button
                type="button"
                onClick={() => startAddonCheckout('PACKAGE_10_OBJECTS')}
                disabled={paying || flags.objectPackagePaid}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:inline-flex sm:w-auto"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                {flags.objectPackagePaid ? 'Balíček aktivní' : `Aktivovat balíček (${upgradeHint.pricePerYearCzk} Kč / rok)`}
              </button>
            </>
          )}

          {upgradeHint.kind === 'CUSTOMER_EXTRA' && (
            <>
              <p className="text-sm text-gray-300">
                Přidat další objekt nad rámec základu lze za
                <strong className="text-white"> {upgradeHint.pricePerYearCzk} Kč / rok / objekt</strong>.
              </p>
              <button
                type="button"
                onClick={() =>
                  startAddonCheckout('CUSTOMER_EXTRA_OBJECT', flags.objectLimitExtraPaid + 1)
                }
                disabled={paying}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:inline-flex sm:w-auto"
              >
                {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
                Přidat 1 objekt ({upgradeHint.pricePerYearCzk} Kč / rok)
              </button>
            </>
          )}

          {upgradeHint.kind === 'INDIVIDUAL' && (
            <>
              <p className="text-sm text-gray-300">
                Vyčerpali jste maximální limit. Pro více objektů nás kontaktujte – připravíme
                <strong className="text-white"> individuální nabídku</strong>.
              </p>
              <a
                href="mailto:info@revizone.cz?subject=Individu%C3%A1ln%C3%AD%20nab%C3%ADdka%20%E2%80%93%20objekty"
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover sm:inline-flex sm:w-auto"
              >
                <Phone className="h-4 w-4" />
                Kontaktovat obchod
              </a>
            </>
          )}
        </div>
      )}

      {/* Doplňková upsell nabídka i když ještě limit není vyčerpaný */}
      {upgradeHint.kind === 'NONE' && !flags.objectPackagePaid && (role === 'SVJ' || role === 'COMPANY_ADMIN') && (
        <div className="mt-4 rounded-xl border border-white/5 bg-black/20 p-3 text-xs text-gray-400">
          Plánujete více objektů? Balíček do {rules.packageLimit} objektů je k dispozici za{' '}
          <strong className="text-gray-200">{rules.packagePricePerYearCzk} Kč / rok</strong>.{' '}
          <button
            type="button"
            onClick={() => startAddonCheckout('PACKAGE_10_OBJECTS')}
            disabled={paying}
            className="font-semibold text-brand-yellow hover:underline disabled:opacity-50"
          >
            Aktivovat
          </button>
        </div>
      )}

      {/* Správa aktivních doplňků – CUSTOMER: snížit / zrušit; SVJ+firma: zrušit balíček */}
      {(flags.objectLimitExtraPaid > 0 || flags.objectPackagePaid) && (
        <div className="mt-4 border-t border-white/5 pt-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
            <span className="mr-1">Aktivní doplněk:</span>
            {role === 'CUSTOMER' && flags.objectLimitExtraPaid > 0 && (
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">
                +{flags.objectLimitExtraPaid} × {rules.extraPricePerYearCzk} Kč
              </span>
            )}
            {(role === 'SVJ' || role === 'COMPANY_ADMIN') && flags.objectPackagePaid && (
              <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-300">
                Balíček do {rules.packageLimit} ({rules.packagePricePerYearCzk} Kč / rok)
              </span>
            )}
            {mutating && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {role === 'CUSTOMER' && flags.objectLimitExtraPaid > 0 && (
              <>
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() =>
                    mutateAddon({
                      kind: 'CUSTOMER_EXTRA_OBJECT',
                      action: 'SET_QUANTITY',
                      quantity: flags.objectLimitExtraPaid + 1,
                      confirmText: `Zvýšit počet zaplacených dalších objektů na ${flags.objectLimitExtraPaid + 1}? Přepočet ceny proběhne poměrně podle stávajícího období.`,
                      successText: 'Limit byl navýšen.',
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:opacity-50"
                  title="Zvýšit o 1 objekt"
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  Zvýšit o 1
                </button>
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() =>
                    mutateAddon({
                      kind: 'CUSTOMER_EXTRA_OBJECT',
                      action: 'SET_QUANTITY',
                      quantity: Math.max(0, flags.objectLimitExtraPaid - 1),
                      confirmText: 'Snížit počet zaplacených dalších objektů o 1?',
                      successText: 'Změna byla aplikována.',
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:opacity-50"
                  title="Snížit o 1 objekt"
                >
                  <ArrowDownRight className="h-3.5 w-3.5" />
                  Snížit o 1
                </button>
                <button
                  type="button"
                  disabled={mutating}
                  onClick={() =>
                    mutateAddon({
                      kind: 'CUSTOMER_EXTRA_OBJECT',
                      action: 'CANCEL',
                      confirmText:
                        'Zrušit předplatné dalších objektů? Limit se po konci aktuálního období vrátí na 1.',
                      successText: 'Předplatné bylo nastaveno na zrušení k datu obnovy.',
                    })
                  }
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <XIcon className="h-3.5 w-3.5" />
                  Zrušit
                </button>
              </>
            )}

            {(role === 'SVJ' || role === 'COMPANY_ADMIN') && flags.objectPackagePaid && (
              <button
                type="button"
                disabled={mutating}
                onClick={() =>
                  mutateAddon({
                    kind: 'PACKAGE_10_OBJECTS',
                    action: 'CANCEL',
                    confirmText:
                      'Zrušit balíček do 10 objektů? Limit se po konci aktuálního období vrátí na 3.',
                    successText: 'Balíček byl nastaven na zrušení k datu obnovy.',
                  })
                }
                className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/10 disabled:opacity-50"
              >
                <XIcon className="h-3.5 w-3.5" />
                Zrušit balíček
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
