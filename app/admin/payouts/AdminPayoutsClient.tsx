'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Search, X, Copy, Check, FileText, ExternalLink, AlertTriangle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AdminPayoutsClient({ requests: initialRequests }: { requests: any[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [amountsPaid, setAmountsPaid] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      if (statusFilter !== 'all' && req.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const techName = (req.technician?.name || '').toLowerCase();
      const techEmail = (req.technician?.email || '').toLowerCase();
      const orderId = (req.order?.readableId || '').toLowerCase();
      const custName = (req.order?.customer?.name || '').toLowerCase();
      const iban = (req.iban || '').toLowerCase();
      const notes = (req.notes || '').toLowerCase();
      return techName.includes(q) || techEmail.includes(q) || orderId.includes(q) || custName.includes(q) || iban.includes(q) || notes.includes(q);
    });
  }, [requests, search, statusFilter]);

  const handleCopyIban = (reqId: string, iban: string) => {
    navigator.clipboard.writeText(iban);
    setCopiedId(reqId);
    toast.success('Číslo účtu / IBAN zkopírován');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setBusy(id);
    try {
      const body: any = { status };
      if (status === 'PAID') {
        const val = amountsPaid[id];
        if (val) body.amountPaid = Number(val);
      }
      
      const res = await fetch(`/api/admin/payout-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('Nepodařilo se změnit stav');
      
      const updated = await res.json();
      setRequests(reqs => reqs.map(r => r.id === id ? { ...r, ...updated } : r));
      toast.success(status === 'PAID' ? 'Výplata označena jako zaplacená' : 'Stav aktualizován');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const calculateDaysLeft = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    const timeLeft = 7 - diffDays;
    return Math.ceil(timeLeft);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Výplaty (Faktury od techniků)</h1>
          <p className="text-gray-400 text-sm mt-0.5">Schvalování, kontrola faktur a potvrzení výplat technikům.</p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#161616] p-1 text-xs">
          {[
            { id: 'all', label: `Vše (${requests.length})` },
            { id: 'PENDING', label: `Čekající (${requests.filter(r => r.status === 'PENDING').length})` },
            { id: 'PAID', label: 'Vyplaceno' },
            { id: 'REJECTED', label: 'Zamítnuto' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-all",
                statusFilter === tab.id
                  ? 'bg-brand-yellow text-black font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat technika, e-mail, zakázku (#1001), IBAN nebo poznámku…"
          className="w-full rounded-xl border border-white/10 bg-[#161616] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            title="Vymazat vyhledávání"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Mobile Card List (Phones & Small Tablets) */}
      <div className="space-y-3 lg:hidden">
        {filteredRequests.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center text-sm text-gray-500">
            {search || statusFilter !== 'all' ? 'Žádné výplaty neodpovídají zadanému filtru.' : 'Žádné žádosti o výplatu.'}
          </div>
        ) : (
          filteredRequests.map((req) => {
            const daysLeft = req.dueDate 
              ? Math.ceil((new Date(req.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
              : calculateDaysLeft(req.createdAt);
            const isUrgent = req.status === 'PENDING' && daysLeft <= 2 && daysLeft >= 0;
            const isLate = req.status === 'PENDING' && daysLeft < 0;

            return (
              <div
                key={req.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-white text-base truncate">{req.technician?.name || 'Neznámý'}</p>
                    <p className="text-xs text-gray-400 font-mono truncate">{req.technician?.email}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0",
                    req.status === 'PENDING' ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    req.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    "bg-red-500/10 text-red-400 border-red-500/20"
                  )}>
                    {req.status === 'PENDING' ? 'Čeká' : req.status === 'PAID' ? 'Vyplaceno' : 'Zamítnuto'}
                  </span>
                </div>

                <div className="rounded-xl bg-black/40 p-3 mb-3 border border-white/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Požadovaná částka</span>
                    <span className="text-base font-extrabold text-brand-yellow font-mono">
                      {req.amount.toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>

                  {req.iban && (
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                        {req.iban}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyIban(req.id, req.iban)}
                        className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1 text-[11px] font-semibold text-gray-200 hover:bg-white/20 active:scale-95"
                      >
                        {copiedId === req.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        {copiedId === req.id ? 'Zkopírováno' : 'Kopírovat'}
                      </button>
                    </div>
                  )}

                  {req.order && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                      <span className="text-gray-400">Vazba na zakázku</span>
                      <Link
                        href={`/admin/orders?search=${req.order.readableId}`}
                        className="font-mono font-bold text-brand-yellow hover:underline"
                      >
                        #{req.order.readableId}
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-gray-400 mb-3 gap-2">
                  {req.status === 'PENDING' && (
                    <span className={cn("font-medium", isLate ? "text-red-400 font-bold" : isUrgent ? "text-amber-400" : "text-gray-400")}>
                      {isLate ? `⚠️ Po splatnosti: ${Math.abs(daysLeft)} dní` : `Splatnost za: ${daysLeft} dní`}
                    </span>
                  )}
                  {req.invoiceUrl && (
                    <a
                      href={req.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-yellow hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> Faktura technika ↗
                    </a>
                  )}
                </div>

                {req.status === 'PENDING' && (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <input 
                      type="number"
                      placeholder="Skutečně vyplacená částka (Kč)"
                      className="w-full rounded-xl border border-white/10 bg-[#222] px-3 py-2 text-xs text-white"
                      value={amountsPaid[req.id] || ''}
                      onChange={(e) => setAmountsPaid({ ...amountsPaid, [req.id]: e.target.value })}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        type="button"
                        disabled={busy === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'PAID')}
                        className="flex min-h-[44px] items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-xs hover:bg-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        Zaplaceno ✓
                      </button>
                      <button 
                        type="button"
                        disabled={busy === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                        className="flex min-h-[44px] items-center justify-center rounded-xl bg-red-500/20 text-red-400 font-bold text-xs hover:bg-red-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                      >
                        Zamítnout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block bg-[#161616] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#111] text-gray-400 text-xs uppercase border-b border-white/10 font-semibold tracking-wider">
            <tr>
              <th className="px-4 py-3.5">Technik</th>
              <th className="px-4 py-3.5">Částka / Účet</th>
              <th className="px-4 py-3.5">Objednávka</th>
              <th className="px-4 py-3.5">Poznámka / Faktura</th>
              <th className="px-4 py-3.5">Splatnost</th>
              <th className="px-4 py-3.5">Stav</th>
              <th className="px-4 py-3.5 text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {search || statusFilter !== 'all' ? 'Žádné výplaty neodpovídají zadanému filtru.' : 'Žádné žádosti o výplatu.'}
                </td>
              </tr>
            ) : (
              filteredRequests.map(req => {
              const daysLeft = req.dueDate 
                ? Math.ceil((new Date(req.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                : calculateDaysLeft(req.createdAt);
              const isUrgent = req.status === 'PENDING' && daysLeft <= 2 && daysLeft >= 0;
              const isLate = req.status === 'PENDING' && daysLeft < 0;

              return (
                <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white">{req.technician?.name || 'Neznámý'}</div>
                    <div className="text-xs text-gray-500 font-mono">{req.technician?.email}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-bold text-brand-yellow font-mono text-base">{req.amount.toLocaleString('cs-CZ')} Kč</div>
                    {req.iban ? (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-gray-400 mt-1">
                        <span>{req.iban}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyIban(req.id, req.iban)}
                          className="text-gray-500 hover:text-white"
                          title="Kopírovat IBAN"
                        >
                          {copiedId === req.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Nespecifikován</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {req.order ? (
                      <div>
                        <Link 
                          href={`/admin/orders?search=${req.order.readableId}`} 
                          className="font-mono text-xs font-bold text-brand-yellow hover:underline"
                        >
                          #{req.order.readableId}
                        </Link>
                        {req.order.customer?.name && <div className="text-xs text-gray-500 mt-0.5">{req.order.customer.name}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 max-w-[200px] truncate" title={req.notes}>
                    <div className="truncate text-xs">{req.notes || '-'}</div>
                    {req.invoiceUrl && (
                      <div className="mt-1.5">
                        <a 
                          href={req.invoiceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-1 text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded-lg text-white border border-white/10 transition-colors"
                        >
                          <FileText className="h-3 w-3" /> Faktura
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-xs">{req.dueDate ? new Date(req.dueDate).toLocaleDateString('cs-CZ') : new Date(req.createdAt).toLocaleDateString('cs-CZ')}</div>
                    {req.status === 'PENDING' && (
                      <div className={cn(
                        "text-xs font-semibold mt-1",
                        isLate ? "text-red-500" : isUrgent ? "text-orange-400" : "text-gray-400"
                      )}>
                        {isLate ? `Po splatnosti: ${Math.abs(daysLeft)} dní` : `Zbývá: ${daysLeft} dní`}
                      </div>
                    )}
                    {req.status === 'PAID' && req.paidAt && (
                      <div className="text-xs text-emerald-400 mt-1">Vyplaceno: {new Date(req.paidAt).toLocaleDateString('cs-CZ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      req.status === 'PENDING' ? "bg-blue-500/10 text-blue-400" :
                      req.status === 'PAID' ? "bg-emerald-500/10 text-emerald-400" :
                      req.status === 'REJECTED' ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"
                    )}>
                      {req.status === 'PENDING' ? 'Čeká' : req.status === 'PAID' ? 'Vyplaceno' : 'Zamítnuto'}
                    </span>
                    {req.status === 'PAID' && req.amountPaid && (
                      <div className="text-xs font-bold text-emerald-400 mt-1">
                        {req.amountPaid.toLocaleString('cs-CZ')} Kč
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex flex-col items-end gap-2">
                        <input 
                          type="number"
                          placeholder="Vyplacená částka"
                          className="bg-[#111] border border-white/10 text-white text-xs px-2.5 py-1.5 rounded-lg w-32"
                          value={amountsPaid[req.id] || ''}
                          onChange={(e) => setAmountsPaid({ ...amountsPaid, [req.id]: e.target.value })}
                        />
                        <div className="flex items-center gap-1.5">
                          <button 
                            disabled={busy === req.id}
                            onClick={() => handleUpdateStatus(req.id, 'PAID')}
                            className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Zaplaceno
                          </button>
                          <button 
                            disabled={busy === req.id}
                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Zamítnout
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        disabled={busy === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'PENDING')}
                        className="px-3 py-1.5 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded-lg text-xs transition-colors disabled:opacity-50"
                      >
                        Vrátit do čekajících
                      </button>
                    )}
                  </td>
                </tr>
              );
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
