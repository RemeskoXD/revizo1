'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Check, X, Search, User, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

type Row = {
  id: string;
  createdAt: string;
  note: string | null;
  user: { id: string; email: string | null; name: string | null; role: string; createdAt: string };
};

export default function AccountDeletionsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const name = (r.user?.name || '').toLowerCase();
      const email = (r.user?.email || '').toLowerCase();
      const role = (r.user?.role || '').toLowerCase();
      const note = (r.note || '').toLowerCase();
      return name.includes(q) || email.includes(q) || role.includes(q) || note.includes(q);
    });
  }, [rows, search]);

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('Schválit smazání účtu? Uživatel se nebude moci přihlásit.')) return;
    if (action === 'reject' && !confirm('Zamítnout žádost o smazání?')) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/account-deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== id));
        toast.success(action === 'approve' ? 'Žádost o smazání účtu byla schválena.' : 'Žádost o smazání byla zamítnuta.');
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.message || 'Chyba při zpracování žádosti.');
      }
    } catch {
      toast.error('Došlo k chybě při komunikaci se serverem.');
    } finally {
      setLoading(null);
    }
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/5 bg-[#141414] p-12 text-center text-sm text-gray-500">
        Žádné čekající žádosti o smazání účtu.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat podle jména, e-mailu, role nebo poznámky…"
          className="w-full min-h-[44px] rounded-2xl border border-white/10 bg-[#161616] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            title="Vymazat vyhledávání"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile Card List (Phones & Small Tablets) */}
      <div className="space-y-3 lg:hidden">
        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center text-sm text-gray-500">
            Žádné žádosti neodpovídají zadanému filtru.
          </div>
        ) : (
          filteredRows.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white text-base leading-snug">{r.user.name || 'Bez jména'}</p>
                  <p className="text-xs text-gray-400 font-mono truncate">{r.user.email}</p>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-gray-300 border border-white/10 shrink-0">
                  {r.user.role}
                </span>
              </div>

              {r.note && (
                <div className="rounded-xl bg-black/40 p-2.5 border border-white/5 text-xs text-gray-300">
                  <span className="text-[10px] text-gray-500 block mb-0.5 font-semibold">Důvod / Poznámka uživatele:</span>
                  {r.note}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-white/5">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(r.createdAt).toLocaleString('cs-CZ')}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={loading === r.id}
                    onClick={() => act(r.id, 'approve')}
                    className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 text-xs font-bold text-red-400 hover:bg-red-500/25 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Schválit smazání
                  </button>
                  <button
                    type="button"
                    disabled={loading === r.id}
                    onClick={() => act(r.id, 'reject')}
                    className="min-h-[44px] px-3.5 py-2 inline-flex items-center gap-1.5 rounded-xl bg-white/5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Zamítnout
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#111] text-xs font-semibold uppercase text-gray-400 border-b border-white/10">
              <tr>
                <th className="px-5 py-4 font-semibold w-44">Datum</th>
                <th className="px-5 py-4 font-semibold w-60">Uživatel</th>
                <th className="px-5 py-4 font-semibold w-32">Role</th>
                <th className="px-5 py-4 font-semibold">Poznámka</th>
                <th className="px-5 py-4 font-semibold text-right w-56">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    Žádné žádosti neodpovídají zadanému filtru.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-400 font-mono">
                      {new Date(r.createdAt).toLocaleString('cs-CZ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-white font-semibold text-xs">{r.user.name || '—'}</div>
                      <div className="text-[11px] text-gray-500 font-mono">{r.user.email}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-mono font-medium text-gray-300 px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        {r.user.role}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3.5 text-xs text-gray-400 truncate">
                      {r.note || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={loading === r.id}
                          onClick={() => act(r.id, 'approve')}
                          className="inline-flex items-center gap-1 rounded-xl bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/25 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Schválit smazání
                        </button>
                        <button
                          type="button"
                          disabled={loading === r.id}
                          onClick={() => act(r.id, 'reject')}
                          className="inline-flex items-center gap-1 rounded-xl bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" /> Zamítnout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
