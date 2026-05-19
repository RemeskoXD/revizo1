'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Copy,
  KeyRound,
  Building,
  Wallet,
  Loader2,
  X as XIcon,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type OnboardingState = {
  hasInviteCode: boolean;
  inviteCode: string | null;
  techCount: number;
  hasTechnicians: boolean;
  hasObjects: boolean;
  objectCount: number;
  techBillingActive: boolean;
};

const DISMISS_KEY = 'revizone:company-onboarding:dismissed';

/**
 * Onboarding wizard pro nové firmy – seznam kroků k dokončení provozu.
 * Skryje se automaticky, když jsou všechny kroky hotové,
 * nebo když uživatel klikne na „Skrýt“.
 */
export function CompanyOnboardingWizard() {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [generatingCode, setGeneratingCode] = useState(false);

  useEffect(() => {
    setDismissed(typeof window !== 'undefined' && window.localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/company/onboarding', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OnboardingState | null) => setState(d))
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generateCode = useCallback(async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch('/api/company/settings/generate-code', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('Kód byl vygenerován');
        load();
      } else {
        toast.error(data?.error || 'Generování selhalo');
      }
    } catch {
      toast.error('Generování selhalo');
    } finally {
      setGeneratingCode(false);
    }
  }, [load]);

  const copyCode = useCallback(async () => {
    if (!state?.inviteCode) return;
    try {
      await navigator.clipboard.writeText(state.inviteCode);
      toast.success('Kód zkopírován');
    } catch {
      toast.error('Nepodařilo se zkopírovat');
    }
  }, [state?.inviteCode]);

  const dismiss = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  if (loading || !state || dismissed) return null;

  const steps = [
    {
      key: 'inviteCode',
      done: state.hasInviteCode,
      icon: KeyRound,
      title: 'Vygenerujte invite kód',
      description: state.hasInviteCode
        ? `Váš kód: ${state.inviteCode}`
        : 'Technici se k vám připojí přes invite kód – vygenerujte si ho jedním klikem.',
      action: state.hasInviteCode ? (
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-white/5"
        >
          <Copy className="h-3.5 w-3.5" />
          Kopírovat
        </button>
      ) : (
        <button
          type="button"
          onClick={generateCode}
          disabled={generatingCode}
          className="flex items-center gap-1.5 rounded-md bg-brand-yellow px-3 py-1.5 text-xs font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
        >
          {generatingCode ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Vygenerovat
        </button>
      ),
    },
    {
      key: 'technicians',
      done: state.hasTechnicians,
      icon: Building,
      title: 'Pozvěte první techniky',
      description: state.hasTechnicians
        ? `${state.techCount} ${state.techCount === 1 ? 'připojený technik' : state.techCount < 5 ? 'připojení technici' : 'připojených techniků'}.`
        : 'Pošlete techniky invite kód, nebo schvalte jejich žádosti v sekci „Technici“.',
      action: (
        <Link
          href="/company/technicians"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/5"
        >
          Přejít na techniky
        </Link>
      ),
    },
    {
      key: 'objects',
      done: state.hasObjects,
      icon: Building,
      title: 'Přidejte vlastní objekty',
      description: state.hasObjects
        ? `Evidujete ${state.objectCount} ${state.objectCount === 1 ? 'objekt' : state.objectCount < 5 ? 'objekty' : 'objektů'}.`
        : 'Firma má v základu 3 vlastní objekty (např. pobočky). Pro více aktivujte balíček.',
      action: (
        <Link
          href="/company"
          className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-white/5"
        >
          Spravovat
        </Link>
      ),
    },
    {
      key: 'billing',
      done: state.techBillingActive,
      icon: Wallet,
      title: 'Aktivujte měsíční billing techniků',
      description: state.techBillingActive
        ? 'Měsíční fakturace 200 Kč × billable seats je aktivní.'
        : state.hasTechnicians
          ? 'Pro plný provoz aktivujte billing – fakturace 200 Kč / měsíc / technik, každý 10. zdarma.'
          : 'Po přidání prvních techniků aktivujte billing pro plný provoz.',
      action: null,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const isAllDone = completedCount === steps.length;

  if (isAllDone) {
    // Vše hotové – wizard nezobrazuj.
    return null;
  }

  return (
    <div className="rounded-2xl border border-brand-yellow/20 bg-brand-yellow/5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white">Začínáme s Revizone pro firmy</h3>
          <p className="mt-1 text-sm text-gray-300">
            Dokončete tyto kroky a získáte plně funkční firemní účet.{' '}
            <strong className="text-brand-yellow">{completedCount} / {steps.length}</strong> hotovo.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-gray-400 hover:text-white"
          title="Skrýt"
          aria-label="Skrýt průvodce"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full bg-brand-yellow transition-all"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      <ol className="mt-5 space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <li
              key={step.key}
              className={`flex items-start gap-3 rounded-xl border p-3 sm:p-4 ${
                step.done
                  ? 'border-emerald-500/20 bg-emerald-500/5'
                  : 'border-white/10 bg-black/30'
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  step.done ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/5 text-gray-400'
                }`}
              >
                {step.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {i + 1}. krok
                  </span>
                  {step.done && (
                    <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase text-emerald-300">
                      Hotovo
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm font-semibold text-white">{step.title}</p>
                <p className="mt-1 text-xs text-gray-400">{step.description}</p>
              </div>
              {step.action && <div className="ml-auto flex shrink-0 items-center">{step.action}</div>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
