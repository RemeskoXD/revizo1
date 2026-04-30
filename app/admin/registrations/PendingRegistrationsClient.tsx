'use client';

import { useMemo, useState } from 'react';
import { Check, X, ExternalLink, Clock, Building2, Wrench, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

export type PendingRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  ico: string | null;
  expectedTechnicians: number | null;
  pendingCompanyInviteCode: string | null;
  licenseMimeType: string | null;
  createdAt: string;
};

function defaultValidUntilDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function PendingRegistrationsClient({ initialRows }: { initialRows: PendingRow[] }) {
  const [rows, setRows] = useState(initialRows);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [approveForId, setApproveForId] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState(defaultValidUntilDate);

  const approveRow = useMemo(() => rows.find((r) => r.id === approveForId), [rows, approveForId]);

  const openApprove = (userId: string) => {
    setValidUntil(defaultValidUntilDate());
    setApproveForId(userId);
  };

  const confirmApprove = async () => {
    if (!approveForId) return;
    setLoadingId(approveForId);
    try {
      const res = await fetch(`/api/admin/pending-registrations/${approveForId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', revisionAuthValidUntil: validUntil }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== approveForId));
        setApproveForId(null);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Chyba');
      }
    } catch {
      alert('Chyba');
    } finally {
      setLoadingId(null);
    }
  };

  const actReject = async (userId: string) => {
    if (!window.confirm('Opravdu zamítnout tuto registraci? Uživatel dostane e-mail.')) {
      return;
    }
    setLoadingId(userId);
    try {
      const res = await fetch(`/api/admin/pending-registrations/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== userId));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Chyba');
      }
    } catch {
      alert('Chyba');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-[#111] p-4 sm:p-6">
      {approveForId && approveRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white">Schválit registraci</h3>
            <p className="mt-2 text-sm text-gray-400">
              Uživatel <span className="text-white">{approveRow.name}</span> ({approveRow.email}) získá přístup
              jako {approveRow.role === 'TECHNICIAN' ? 'technik' : 'firma'}. Zadejte, do kdy platí{' '}
              <strong className="text-brand-yellow">oprávnění provádět revize</strong> (včetně uvedeného dne).
            </p>
            <label className="mt-4 block text-sm font-medium text-gray-400">
              Platnost oprávnění do
            </label>
            <div className="relative mt-1">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#111] py-2.5 pl-10 pr-3 text-white"
              />
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setApproveForId(null)}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 hover:bg-white/5"
              >
                Zrušit
              </button>
              <button
                type="button"
                onClick={() => void confirmApprove()}
                disabled={loadingId === approveForId}
                className="rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
              >
                {loadingId === approveForId ? 'Ukládám…' : 'Schválit s platností'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-gray-500 border-b border-white/5">
            <tr>
              <th className="pb-3 font-medium">Typ / kontakt</th>
              <th className="pb-3 font-medium">Údaje</th>
              <th className="pb-3 font-medium">Datum</th>
              <th className="pb-3 font-medium text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  Žádné čekající registrace.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.04 }}
                  className="group hover:bg-white/[0.02]"
                >
                  <td className="py-4 align-top">
                    <div className="flex items-center gap-2 text-white font-medium">
                      {row.role === 'TECHNICIAN' ? (
                        <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      {row.role === 'TECHNICIAN' ? 'Technik' : 'Firma'}
                    </div>
                    <p className="text-white mt-1">{row.name}</p>
                    <p className="text-xs text-gray-500">{row.email}</p>
                  </td>
                  <td className="py-4 align-top text-gray-400 text-xs space-y-1 max-w-md">
                    {row.phone && <p>Tel.: {row.phone}</p>}
                    {row.address && <p>Adresa: {row.address}</p>}
                    {row.ico && <p>IČO: {row.ico}</p>}
                    {row.role === 'COMPANY_ADMIN' && row.expectedTechnicians != null && (
                      <p>Plánovaný počet techniků: {row.expectedTechnicians}</p>
                    )}
                    {row.pendingCompanyInviteCode && (
                      <p>Kód firmy: {row.pendingCompanyInviteCode}</p>
                    )}
                    <a
                      href={`/api/admin/pending-registrations/${row.id}/license`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-brand-yellow hover:underline mt-2"
                    >
                      <ExternalLink className="w-3 h-3" /> Zobrazit oprávnění
                    </a>
                  </td>
                  <td className="py-4 align-top text-gray-500 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(row.createdAt).toLocaleString('cs-CZ')}
                    </span>
                  </td>
                  <td className="py-4 text-right align-top">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openApprove(row.id)}
                        disabled={loadingId === row.id}
                        className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Schválit (zadejte platnost oprávnění)"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => actReject(row.id)}
                        disabled={loadingId === row.id}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                        title="Zamítnout"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
