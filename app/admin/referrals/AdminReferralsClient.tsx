'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Gift,
  Search,
  CheckCircle2,
  Clock,
  X as XIcon,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

type Reward = {
  id: string;
  amountCzk: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | string;
  createdAt: string;
  paidAt: string | null;
  notes: string | null;
  realtor: { id: string; name: string | null; email: string | null };
  customer: { id: string; name: string | null; email: string | null };
};

type Totals = {
  pendingCzk: number;
  pendingCount: number;
  paidCzk: number;
  paidCount: number;
  cancelledCount: number;
};

const STATUS_FILTERS = [
  { value: 'all', label: 'Vše' },
  { value: 'PENDING', label: 'Čeká' },
  { value: 'PAID', label: 'Vyplaceno' },
  { value: 'CANCELLED', label: 'Zrušeno' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING: { label: 'Čeká', cls: 'bg-amber-500/10 text-amber-300' },
  PAID: { label: 'Vyplaceno', cls: 'bg-emerald-500/10 text-emerald-300' },
  CANCELLED: { label: 'Zrušeno', cls: 'bg-red-500/10 text-red-300' },
};

export default function AdminReferralsClient({ canEdit }: { canEdit: boolean }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('PENDING');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (query.trim()) params.set('q', query.trim());
      const res = await fetch(`/api/admin/referral-rewards?${params.toString()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok) {
        setRewards(data.rewards ?? []);
        setTotals(data.totals ?? null);
      } else {
        toast.error(data.message || 'Načtení selhalo');
      }
    } catch {
      toast.error('Načtení selhalo');
    } finally {
      setLoading(false);
    }
  }, [filter, query]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 200);
    return () => clearTimeout(t);
  }, [load]);

  const mutate = useCallback(
    async (id: string, status: 'PAID' | 'CANCELLED' | 'PENDING') => {
      if (!canEdit) return;
      setUpdatingId(id);
      try {
        const res = await fetch(`/api/admin/referral-rewards/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success('Stav byl aktualizován');
          load();
        } else {
          toast.error(data.message || 'Akce selhala');
        }
      } catch {
        toast.error('Akce selhala');
      } finally {
        setUpdatingId(null);
      }
    },
    [canEdit, load],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!canEdit) return;
      if (!confirm('Opravdu smazat tuto odměnu? Akce je nevratná.')) return;
      setUpdatingId(id);
      try {
        const res = await fetch(`/api/admin/referral-rewards/${id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Smazáno');
          load();
        } else {
          const j = await res.json().catch(() => ({}));
          toast.error(j.message || 'Smazání selhalo');
        }
      } catch {
        toast.error('Smazání selhalo');
      } finally {
        setUpdatingId(null);
      }
    },
    [canEdit, load],
  );

  const formatCzk = (n: number) => `${n.toLocaleString('cs-CZ')} Kč`;
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Gift className="h-6 w-6 text-brand-yellow" />
            Referral odměny
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Správa odměn pro makléře po úspěšné registraci přivedených zákazníků.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover"
          >
            <Plus className="h-4 w-4" />
            Manuální odměna
          </button>
        )}
      </div>

      {totals && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="text-xs text-amber-400/80">Čeká na vyplacení</div>
            <div className="mt-1 text-2xl font-bold text-amber-300">
              {formatCzk(totals.pendingCzk)}
            </div>
            <div className="text-xs text-amber-400/60">{totals.pendingCount} odměn</div>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="text-xs text-emerald-400/80">Vyplaceno celkem</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300">
              {formatCzk(totals.paidCzk)}
            </div>
            <div className="text-xs text-emerald-400/60">{totals.paidCount} odměn</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#111] p-4">
            <div className="text-xs text-gray-500">Zrušeno</div>
            <div className="mt-1 text-2xl font-bold text-gray-300">{totals.cancelledCount}</div>
            <div className="text-xs text-gray-500">odměn</div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat e-mail / jméno makléře nebo zákazníka…"
            className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
        </div>
        <div className="flex gap-1 rounded-lg border border-white/10 bg-[#1A1A1A] p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                filter === f.value
                  ? 'bg-brand-yellow text-black'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase text-gray-400">
              <tr>
                <th className="px-3 py-3 sm:px-4">Makléř</th>
                <th className="px-3 py-3 sm:px-4">Zákazník</th>
                <th className="px-3 py-3 sm:px-4">Datum</th>
                <th className="px-3 py-3 sm:px-4">Stav</th>
                <th className="px-3 py-3 text-right sm:px-4">Částka</th>
                <th className="px-3 py-3 sm:px-4">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-brand-yellow" />
                  </td>
                </tr>
              ) : rewards.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                    Žádné odměny neodpovídají filtru.
                  </td>
                </tr>
              ) : (
                rewards.map((r) => {
                  const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.PENDING;
                  return (
                    <tr key={r.id} className="text-gray-200">
                      <td className="px-3 py-3 sm:px-4">
                        <div className="font-medium text-white">{r.realtor.name || '—'}</div>
                        <div className="text-xs text-gray-500">{r.realtor.email}</div>
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <div className="font-medium text-white">{r.customer.name || '—'}</div>
                        <div className="text-xs text-gray-500">{r.customer.email}</div>
                        {r.notes && (
                          <div className="mt-1 max-w-xs truncate text-[11px] text-gray-500" title={r.notes}>
                            {r.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-400 sm:px-4">
                        {formatDate(r.createdAt)}
                        {r.paidAt && (
                          <div className="mt-0.5 text-[11px] text-emerald-400/80">
                            Vyplaceno {formatDate(r.paidAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${badge.cls}`}
                        >
                          {r.status === 'PENDING' && <Clock className="h-3 w-3" />}
                          {r.status === 'PAID' && <CheckCircle2 className="h-3 w-3" />}
                          {r.status === 'CANCELLED' && <XIcon className="h-3 w-3" />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold sm:px-4">
                        {formatCzk(r.amountCzk)}
                      </td>
                      <td className="px-3 py-3 sm:px-4">
                        {canEdit ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {r.status !== 'PAID' && (
                              <button
                                type="button"
                                disabled={updatingId === r.id}
                                onClick={() => void mutate(r.id, 'PAID')}
                                className="rounded-md border border-emerald-500/30 px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                              >
                                Vyplatit
                              </button>
                            )}
                            {r.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                disabled={updatingId === r.id}
                                onClick={() => void mutate(r.id, 'CANCELLED')}
                                className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
                              >
                                Zrušit
                              </button>
                            )}
                            {r.status !== 'PENDING' && (
                              <button
                                type="button"
                                disabled={updatingId === r.id}
                                onClick={() => void mutate(r.id, 'PENDING')}
                                className="rounded-md border border-white/10 px-2 py-1 text-xs font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
                              >
                                Vrátit
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={updatingId === r.id}
                              onClick={() => void remove(r.id)}
                              className="rounded-md p-1.5 text-gray-500 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                              title="Smazat"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <CreateRewardModal onClose={() => setCreateOpen(false)} onCreated={load} />
      )}
    </div>
  );
}

function CreateRewardModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [realtorEmail, setRealtorEmail] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [amount, setAmount] = useState<number>(20);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/referral-rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realtorEmail: realtorEmail.trim().toLowerCase(),
          customerEmail: customerEmail.trim().toLowerCase(),
          amountCzk: amount,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Odměna byla vytvořena');
        onCreated();
        onClose();
      } else {
        toast.error(data.message || 'Vytvoření selhalo');
      }
    } catch {
      toast.error('Vytvoření selhalo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-4">
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#111] p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">Manuální referral odměna</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
            aria-label="Zavřít"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Pro případy, kdy zákazník nepřišel přes link <code className="text-brand-yellow">?ref=…</code>.
        </p>

        <div className="mt-5 space-y-3">
          <div>
            <label className="text-xs text-gray-400">E-mail makléře</label>
            <input
              type="email"
              required
              value={realtorEmail}
              onChange={(e) => setRealtorEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
              placeholder="makler@firma.cz"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">E-mail zákazníka</label>
            <input
              type="email"
              required
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
              placeholder="zakaznik@email.cz"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Částka (Kč)</label>
            <input
              type="number"
              min={0}
              max={100000}
              value={amount}
              onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400">Poznámka (volitelná)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2 text-white"
              placeholder="Např. „Makléř X přivedl zákazníka mimo platformu …“"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
          >
            Zrušit
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
          >
            {saving ? 'Ukládám…' : 'Vytvořit'}
          </button>
        </div>
      </form>
    </div>
  );
}
