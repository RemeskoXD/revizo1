'use client';

import { useState } from 'react';
import { Gift, Copy, ExternalLink, CheckCircle2, Clock, X as XIcon, Users, ArrowUpRight, Loader2, Home } from 'lucide-react';
import { toast } from 'react-hot-toast';

type RewardRow = {
  id: string;
  amountCzk: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  customer: { id: string; name: string | null; email: string | null; registeredAt: string };
};

type ReferredRow = {
  id: string;
  name: string | null;
  email: string | null;
  registeredAt: string;
  hasActiveLicense: boolean;
};

type TransferFeeRow = {
  id: string;
  amountCzk: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  property: { id: string; name: string; address: string | null };
  customer: { id: string; name: string | null; email: string | null };
};

type Summary = {
  pendingCzk: number;
  pendingCount: number;
  paidCzk: number;
  paidCount: number;
  cancelledCount: number;
  totalCzk: number;
  totalCount: number;
};

export default function RealtyReferralsClient({
  inviteCode,
  referralLink,
  rewardCzk,
  transferFeeCzk,
  transferRebateCzk,
  summary,
  rewards,
  referredCustomers,
  transferFees,
}: {
  inviteCode: string;
  referralLink: string;
  rewardCzk: number;
  transferFeeCzk: number;
  transferRebateCzk: number;
  summary: Summary;
  rewards: RewardRow[];
  referredCustomers: ReferredRow[];
  transferFees: TransferFeeRow[];
}) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [payingFee, setPayingFee] = useState<string | null>(null);

  const copy = async (text: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      toast.success('Zkopírováno do schránky');
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast.error('Nepodařilo se zkopírovat');
    }
  };

  const formatCzk = (n: number) => `${n.toLocaleString('cs-CZ')} Kč`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const payTransferFee = async (feeId: string) => {
    setPayingFee(feeId);
    try {
      const res = await fetch('/api/stripe/checkout/transfer-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeId, returnPath: '/realty' }),
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
      setPayingFee(null);
    }
  };

  const pendingTransfers = transferFees.filter((t) => t.status === 'PENDING');
  const pendingTotal = pendingTransfers.reduce((s, t) => s + t.amountCzk, 0);

  const STATUS_BADGES: Record<string, { label: string; cls: string }> = {
    PENDING: { label: 'Čeká na vyplacení', cls: 'bg-amber-500/10 text-amber-300' },
    PAID: { label: 'Vyplaceno', cls: 'bg-emerald-500/10 text-emerald-300' },
    CANCELLED: { label: 'Zrušeno', cls: 'bg-red-500/10 text-red-300' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Gift className="h-6 w-6 text-brand-yellow" />
            Doporučení (referral)
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Za každého úspěšně registrovaného zákazníka přivedeného přes váš kód získáte
            <strong className="ml-1 text-brand-yellow">{formatCzk(rewardCzk)}</strong>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
          <div className="text-xs text-gray-500">Celkem získáno</div>
          <div className="mt-1 text-2xl font-bold text-white">{formatCzk(summary.totalCzk)}</div>
          <div className="mt-2 text-xs text-gray-500">{summary.totalCount} doporučení celkem</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
          <div className="text-xs text-gray-500">Vyplaceno</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400/90">
            {formatCzk(summary.paidCzk)}
          </div>
          <div className="mt-2 text-xs text-gray-500">{summary.paidCount} odměn</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5">
          <div className="text-xs text-gray-500">Čeká na vyplacení</div>
          <div className="mt-1 text-2xl font-bold text-amber-400/90">
            {formatCzk(summary.pendingCzk)}
          </div>
          <div className="mt-2 text-xs text-gray-500">{summary.pendingCount} odměn</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white">Váš referenční odkaz</h2>
        <p className="mt-1 text-sm text-gray-400">
          Pošlete tento odkaz zákazníkovi. Po jeho registraci a první úspěšné platbě se vám
          připíše odměna.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-gray-500">Váš kód</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-[#111] px-3 py-2.5">
              <code className="flex-1 truncate font-mono text-sm text-brand-yellow">{inviteCode}</code>
              <button
                type="button"
                onClick={() => copy(inviteCode, 'code')}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
                title="Kopírovat kód"
              >
                {copied === 'code' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500">Plný odkaz</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-white/10 bg-[#111] px-3 py-2.5">
              <code className="flex-1 truncate text-xs text-gray-200" title={referralLink}>
                {referralLink}
              </code>
              <button
                type="button"
                onClick={() => copy(referralLink, 'link')}
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
                title="Kopírovat odkaz"
              >
                {copied === 'link' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
              <a
                href={referralLink}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
                title="Otevřít v novém okně"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Gift className="h-5 w-5 text-brand-yellow" />
          Historie odměn
        </h2>
        {rewards.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Zatím žádné odměny. Sdílejte svůj odkaz – odměna se připíše po první úhradě
            přivedeného zákazníka.
          </p>
        ) : (
          <div className="mt-4 -mx-3 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-3 py-2 sm:px-4">Zákazník</th>
                  <th className="px-3 py-2 sm:px-4">Datum</th>
                  <th className="px-3 py-2 sm:px-4">Stav</th>
                  <th className="px-3 py-2 text-right sm:px-4">Částka</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rewards.map((r) => {
                  const badge = STATUS_BADGES[r.status] ?? STATUS_BADGES.PENDING;
                  return (
                    <tr key={r.id} className="text-gray-200">
                      <td className="px-3 py-2 sm:px-4">
                        <div className="font-medium text-white">
                          {r.customer.name || 'Anonym'}
                        </div>
                        <div className="text-xs text-gray-500">{r.customer.email}</div>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-400 sm:px-4">
                        {formatDate(r.createdAt)}
                        {r.paidAt && (
                          <div className="mt-0.5 text-[11px] text-emerald-400/80">
                            Vyplaceno {formatDate(r.paidAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {r.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {r.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                          {r.status === 'CANCELLED' && <XIcon className="h-3 w-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-semibold sm:px-4">
                        {formatCzk(r.amountCzk)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Home className="h-5 w-5 text-brand-yellow" />
              Poplatky za převody nemovitostí
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Při předání nemovitosti přes invite kód zaplatíte
              <strong className="ml-1 text-white">{formatCzk(transferFeeCzk)}</strong>.
              Pokud nový vlastník zůstane aktivní 30 dní, vrátí se vám
              <strong className="ml-1 text-emerald-300">{formatCzk(transferRebateCzk)}</strong> jako bonus.
            </p>
          </div>
          {pendingTotal > 0 && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-center">
              <div className="text-xs text-red-400/80">K úhradě</div>
              <div className="text-lg font-bold text-red-300">{formatCzk(pendingTotal)}</div>
            </div>
          )}
        </div>

        {transferFees.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Zatím jste neuskutečnil žádný převod přes invite kód.
          </p>
        ) : (
          <div className="mt-4 -mx-3 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-3 py-2 sm:px-4">Nemovitost</th>
                  <th className="px-3 py-2 sm:px-4">Nový vlastník</th>
                  <th className="px-3 py-2 sm:px-4">Datum</th>
                  <th className="px-3 py-2 sm:px-4">Stav</th>
                  <th className="px-3 py-2 text-right sm:px-4">Částka</th>
                  <th className="px-3 py-2 sm:px-4">Akce</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transferFees.map((t) => (
                  <tr key={t.id} className="text-gray-200">
                    <td className="px-3 py-2 sm:px-4">
                      <div className="font-medium text-white">{t.property.name}</div>
                      {t.property.address && (
                        <div className="text-xs text-gray-500">{t.property.address}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-4">
                      <div className="font-medium text-white">{t.customer.name || '—'}</div>
                      <div className="text-xs text-gray-500">{t.customer.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 sm:px-4">
                      {formatDate(t.createdAt)}
                      {t.paidAt && (
                        <div className="mt-0.5 text-[11px] text-emerald-400/80">
                          Uhrazeno {formatDate(t.paidAt)}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 sm:px-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                          t.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-300'
                            : t.status === 'CANCELLED'
                              ? 'bg-red-500/10 text-red-300'
                              : 'bg-amber-500/10 text-amber-300'
                        }`}
                      >
                        {t.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                        {t.status === 'PENDING' && <Clock className="h-3 w-3" />}
                        {t.status === 'CANCELLED' && <XIcon className="h-3 w-3" />}
                        {t.status === 'PENDING' ? 'K úhradě' : t.status === 'PAID' ? 'Uhrazeno' : 'Zrušeno'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold sm:px-4">
                      {formatCzk(t.amountCzk)}
                    </td>
                    <td className="px-3 py-2 sm:px-4">
                      {t.status === 'PENDING' ? (
                        <button
                          type="button"
                          disabled={payingFee === t.id}
                          onClick={() => void payTransferFee(t.id)}
                          className="inline-flex items-center gap-1 rounded-md bg-brand-yellow px-2 py-1 text-xs font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
                        >
                          {payingFee === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                          Uhradit
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#1A1A1A] p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <Users className="h-5 w-5 text-brand-yellow" />
          Přivedení zákazníci ({referredCustomers.length})
        </h2>
        {referredCustomers.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Žádný zákazník se zatím přes váš kód neregistroval.
          </p>
        ) : (
          <div className="mt-4 -mx-3 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-3 py-2 sm:px-4">Zákazník</th>
                  <th className="px-3 py-2 sm:px-4">Registrace</th>
                  <th className="px-3 py-2 sm:px-4">Licence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {referredCustomers.map((c) => (
                  <tr key={c.id} className="text-gray-200">
                    <td className="px-3 py-2 sm:px-4">
                      <div className="font-medium text-white">{c.name || 'Anonym'}</div>
                      <div className="text-xs text-gray-500">{c.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-400 sm:px-4">
                      {formatDate(c.registeredAt)}
                    </td>
                    <td className="px-3 py-2 sm:px-4">
                      {c.hasActiveLicense ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" /> Aktivní
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
                          <Clock className="h-3 w-3" /> Bez aktivní licence
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
