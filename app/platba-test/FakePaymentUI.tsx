'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2, X } from 'lucide-react';

type Mode = 'checkout' | 'portal';
type Purpose = 'onboarding' | 'settings';

export default function FakePaymentUI({
  returnPath,
  mode,
  purpose = 'settings',
  planLabel,
  yearlyPriceCzk,
}: {
  returnPath: string;
  mode: Mode;
  purpose?: Purpose;
  planLabel?: string;
  yearlyPriceCzk?: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const successUrl = `${returnPath}?stripe=success&tab=billing`;
  const cancelUrl = `${returnPath}?stripe=cancel&tab=billing`;
  const portalDoneUrl = `${returnPath}?tab=billing`;

  const onSuccess = async () => {
    if (purpose !== 'onboarding') {
      router.replace(successUrl);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/billing/complete-fake-onboarding', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert((data as { message?: string }).message || 'Nepodařilo se dokončit platbu.');
        return;
      }
      router.replace(successUrl);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const showPlan = purpose === 'onboarding' && planLabel != null && yearlyPriceCzk != null;

  return (
    <div className="min-h-dvh bg-[#111] flex flex-col items-center justify-center p-6 text-gray-200">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-8 shadow-xl">
        <div className="mb-6 flex items-center justify-center">
          <div className="rounded-full bg-amber-500/15 p-4">
            <CreditCard className="h-10 w-10 text-amber-400" />
          </div>
        </div>
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-400/90">
          Testovací režim
        </p>
        <h1 className="mt-2 text-center text-xl font-bold text-white">
          {mode === 'portal' ? 'Falešný zákaznický portál' : 'Falešná platební brána'}
        </h1>
        <p className="mt-3 text-center text-sm text-gray-400">
          {mode === 'portal'
            ? 'Simulace Stripe Customer Portal. Žádná skutečná platba ani změna u Stripe.'
            : purpose === 'onboarding'
              ? 'Simulace úhrady ročního předplatného po zkušebním měsíci. Žádné peníze se nestrhávají.'
              : 'Simulace dokončení platby. Žádné peníze se nestrhávají – v produkci vypněte FAKE_PAYMENT_GATEWAY.'}
        </p>

        {showPlan && mode === 'checkout' && (
          <div className="mt-6 rounded-xl border border-white/10 bg-black/25 px-4 py-3 text-center text-sm">
            <p className="text-gray-400">Balíček</p>
            <p className="text-lg font-semibold text-white">
              {planLabel} — {yearlyPriceCzk.toLocaleString('cs-CZ')} Kč / rok
            </p>
            <p className="mt-1 text-xs text-gray-500">1. měsíc od registrace je zdarma, poté roční platba.</p>
          </div>
        )}

        <div className="mt-8 space-y-3">
          {mode === 'checkout' ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSuccess()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-yellow py-3.5 text-center text-sm font-semibold text-black shadow-lg shadow-brand-yellow/15 transition-colors hover:bg-brand-yellow-hover disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {purpose === 'onboarding' ? 'Pokračovat (zaplatit roční předplatné)' : 'Pokračovat (úspěšná platba)'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => router.replace(cancelUrl)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Zrušit (jako uživatel u Stripe)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => router.replace(portalDoneUrl)}
              className="w-full rounded-xl bg-brand-yellow py-3.5 text-center text-sm font-semibold text-black hover:bg-brand-yellow-hover transition-colors"
            >
              Pokračovat zpět do nastavení
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
