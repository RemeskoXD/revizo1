'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Loader2,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type TechBillingResponse = {
  techCount: number;
  billable: number;
  freeTechs: number;
  monthlyCzk: number;
  yearlyCzk: number;
  subscriptionActive: boolean;
  rules: { seatMonthlyCzk: number; freePerN: number };
};

/**
 * Karta pro firemní dashboard – stav billingu techniků (200 Kč / měsíc / billable seat).
 * GET /api/company/tech-billing  ·  POST /api/stripe/checkout/addon  ·  POST /api/stripe/subscriptions/addon
 */
export function CompanyTechBillingCard({
  returnPath,
  className,
}: {
  returnPath: string;
  className?: string;
}) {
  const [data, setData] = useState<TechBillingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [mutating, setMutating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/company/tech-billing', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: TechBillingResponse) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activate = useCallback(async () => {
    setPaying(true);
    try {
      const res = await fetch('/api/stripe/checkout/addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'COMPANY_TECH_SEATS', returnPath }),
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
  }, [returnPath]);

  const cancel = useCallback(async () => {
    if (
      !window.confirm(
        'Zrušit měsíční billing techniků? Subscription bude ukončen po konci aktuálního období.',
      )
    ) {
      return;
    }
    setMutating(true);
    try {
      const res = await fetch('/api/stripe/subscriptions/addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'COMPANY_TECH_SEATS', action: 'CANCEL' }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Billing byl nastaven na zrušení k datu obnovy.');
        load();
      } else {
        toast.error(json.message || 'Nepodařilo se zrušit billing.');
      }
    } catch {
      toast.error('Nepodařilo se zrušit billing.');
    } finally {
      setMutating(false);
    }
  }, [load]);

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 ${className ?? ''}`}
      >
        <Loader2 className="h-5 w-5 animate-spin text-brand-yellow" />
      </div>
    );
  }

  if (!data) return null;

  const { techCount, billable, freeTechs, monthlyCzk, yearlyCzk, subscriptionActive, rules } = data;
  const formatCzk = (n: number) => `${n.toLocaleString('cs-CZ')} Kč`;

  return (
    <div className={`rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Users className="h-4 w-4" />
            <span>Billing techniků</span>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-white">{formatCzk(monthlyCzk)} / měsíc</h3>
          <p className="mt-1 text-xs text-gray-500">
            {techCount} {techCount === 1 ? 'technik' : techCount < 5 ? 'technici' : 'techniků'} ·{' '}
            {billable} placených · {freeTechs} zdarma
          </p>
        </div>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            subscriptionActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
          }`}
        >
          {subscriptionActive ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl border border-white/10 bg-black/30 p-3 text-center">
        <div>
          <div className="text-xs text-gray-500">Techniků</div>
          <div className="mt-1 text-xl font-bold text-white">{techCount}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Placených</div>
          <div className="mt-1 text-xl font-bold text-brand-yellow">{billable}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Ročně</div>
          <div className="mt-1 text-xl font-bold text-white">{formatCzk(yearlyCzk)}</div>
        </div>
      </div>

      <p className="mt-3 text-xs text-gray-500">
        Sazba {formatCzk(rules.seatMonthlyCzk)} / měsíc / technik · každý {rules.freePerN}. zdarma.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {!subscriptionActive ? (
          <button
            type="button"
            onClick={activate}
            disabled={paying || techCount === 0}
            title={techCount === 0 ? 'Zatím nemáte žádné techniky' : undefined}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto"
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpRight className="h-4 w-4" />}
            Aktivovat billing ({formatCzk(monthlyCzk)} / měs)
          </button>
        ) : (
          <button
            type="button"
            onClick={cancel}
            disabled={mutating}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:opacity-50 sm:w-auto"
          >
            {mutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <XIcon className="h-4 w-4" />}
            Zrušit billing
          </button>
        )}
      </div>

      {!subscriptionActive && techCount > 0 && (
        <p className="mt-3 text-xs text-amber-400/90">
          Billing zatím není aktivní – fakturace techniků se nestrhává. Aktivujte pro plný provoz.
        </p>
      )}
    </div>
  );
}
