'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Search, X } from 'lucide-react';

export default function AdminPayoutsClient({ requests: initialRequests }: { requests: any[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [amountsPaid, setAmountsPaid] = useState<Record<string, string>>({});

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
      toast.success('Stav aktualizován');
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
          <p className="text-gray-400 text-sm">Zde schvalujete a potvrzujete výplaty technikům.</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1A1A1A] p-1 text-xs">
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
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                statusFilter === tab.id
                  ? 'bg-brand-yellow text-black font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
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
          className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
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

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#111] text-gray-400 text-xs uppercase border-b border-white/5">
            <tr>
              <th className="px-4 py-3">Technik</th>
              <th className="px-4 py-3">Částka / Účet</th>
              <th className="px-4 py-3">Objednávka</th>
              <th className="px-4 py-3">Poznámka / Faktura</th>
              <th className="px-4 py-3">Splatnost (odpočet)</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3 text-right">Akce</th>
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
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{req.technician?.name || 'Neznámý'}</div>
                    <div className="text-xs text-gray-500">{req.technician?.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-brand-yellow font-mono">{req.amount.toLocaleString('cs-CZ')} Kč</div>
                    <div className="text-xs font-mono text-gray-400 mt-1">{req.iban || 'Nespecifikován'}</div>
                  </td>
                  <td className="px-4 py-3">
                    {req.order ? (
                      <div>
                        <a href={`/admin/orders/${req.order.id}`} className="text-brand-yellow hover:underline">{req.order.readableId}</a>
                        {req.order.customer?.name && <div className="text-xs text-gray-500 mt-1">{req.order.customer.name}</div>}
                      </div>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" title={req.notes}>
                    <div>{req.notes || '-'}</div>
                    {req.invoiceUrl && (
                      <div className="mt-2">
                        <a href={req.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs bg-[#222] hover:bg-[#333] px-2 py-1 rounded text-white border border-white/10 transition-colors">
                          Zobrazit fakturu
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div>{req.dueDate ? new Date(req.dueDate).toLocaleDateString('cs-CZ') : new Date(req.createdAt).toLocaleDateString('cs-CZ')}</div>
                    {req.status === 'PENDING' && (
                      <div className={cn(
                        "text-xs font-semibold mt-1",
                        isLate ? "text-red-500" : isUrgent ? "text-orange-400" : "text-gray-400"
                      )}>
                        {isLate ? `Po splatnosti: ${Math.abs(daysLeft)} dní` : `Zbývá: ${daysLeft} dní`}
                      </div>
                    )}
                    {req.status === 'PAID' && req.paidAt && (
                      <div className="text-xs text-green-500 mt-1">Vyplaceno: {new Date(req.paidAt).toLocaleDateString('cs-CZ')}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      req.status === 'PENDING' ? "bg-blue-500/10 text-blue-400" :
                      req.status === 'PAID' ? "bg-green-500/10 text-green-500" :
                      req.status === 'REJECTED' ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"
                    )}>
                      {req.status}
                    </span>
                    {req.status === 'PAID' && req.amountPaid && (
                      <div className="text-xs font-bold text-green-400 mt-1 text-right">
                        {req.amountPaid.toLocaleString('cs-CZ')} Kč
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'PENDING' ? (
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number"
                            placeholder="Vyplacená částka"
                            className="bg-[#111] border border-white/10 text-white text-xs px-2 py-1 rounded w-32"
                            value={amountsPaid[req.id] || ''}
                            onChange={(e) => setAmountsPaid({ ...amountsPaid, [req.id]: e.target.value })}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            disabled={busy === req.id}
                            onClick={() => handleUpdateStatus(req.id, 'PAID')}
                            className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Zaplaceno
                          </button>
                          <button 
                            disabled={busy === req.id}
                            onClick={() => handleUpdateStatus(req.id, 'REJECTED')}
                            className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            Zamítnout
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        disabled={busy === req.id}
                        onClick={() => handleUpdateStatus(req.id, 'PENDING')}
                        className="px-3 py-1 bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 rounded text-xs transition-colors disabled:opacity-50"
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
