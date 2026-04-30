'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Check, X } from 'lucide-react';

type Row = {
  id: string;
  createdAt: string;
  note: string | null;
  user: { id: string; email: string | null; name: string | null; role: string; createdAt: string };
};

export default function AccountDeletionsClient({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  const act = async (id: string, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('Schválit smazání účtu? Uživatel se nebude moci přihlásit.')) return;
    if (action === 'reject' && !confirm('Zamítnout žádost?')) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/account-deletion-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== id));
        router.refresh();
      } else {
        const d = await res.json();
        alert(d.message || 'Chyba');
      }
    } catch {
      alert('Chyba');
    } finally {
      setLoading(null);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="text-gray-500 text-sm py-8 text-center border border-white/5 rounded-xl bg-[#111]">
        Žádné čekající žádosti o smazání účtu.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
      <div className="table-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-white/5 text-xs font-semibold uppercase text-gray-400">
            <tr>
              <th className="px-3 py-3 sm:px-5 sm:py-4">Datum</th>
              <th className="px-3 py-3 sm:px-5 sm:py-4">Uživatel</th>
              <th className="px-3 py-3 sm:px-5 sm:py-4">Role</th>
              <th className="px-3 py-3 sm:px-5 sm:py-4">Poznámka</th>
              <th className="px-3 py-3 text-right sm:px-5 sm:py-4">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-white/[0.02]">
                <td className="whitespace-nowrap px-3 py-3 text-gray-400 sm:px-5 sm:py-4">
                  {new Date(r.createdAt).toLocaleString('cs-CZ')}
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4">
                  <div className="text-white font-medium">{r.user.name || '—'}</div>
                  <div className="text-xs text-gray-500">{r.user.email}</div>
                </td>
                <td className="px-3 py-3 text-gray-300 sm:px-5 sm:py-4">{r.user.role}</td>
                <td className="max-w-xs px-3 py-3 text-gray-400 sm:px-5 sm:py-4">
                  {r.note || '—'}
                </td>
                <td className="px-3 py-3 text-right sm:px-5 sm:py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      disabled={loading === r.id}
                      onClick={() => act(r.id, 'approve')}
                      className="inline-flex items-center gap-1 rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/25 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" /> Schválit smazání
                    </button>
                    <button
                      type="button"
                      disabled={loading === r.id}
                      onClick={() => act(r.id, 'reject')}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" /> Zamítnout
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
