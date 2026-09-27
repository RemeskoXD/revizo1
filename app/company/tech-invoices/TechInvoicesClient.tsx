'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

function calculateDaysLeft(createdAt: Date) {
  const ONE_DAY = 1000 * 3600 * 24;
  const passedDays = (new Date().getTime() - new Date(createdAt).getTime()) / ONE_DAY;
  return Math.ceil(7 - passedDays);
}

export default function TechInvoicesClient({ requests }: { requests: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [amountsPaid, setAmountsPaid] = useState<Record<string, string>>({});

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setBusy(id);
    try {
      const amountPaidStr = amountsPaid[id];
      const res = await fetch(`/api/admin/payout-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: newStatus,
          amountPaid: newStatus === 'PAID' && amountPaidStr ? Number(amountPaidStr) : undefined
        }),
      });
      if (res.ok) {
        toast.success('Stav faktury technika byl úspěšně změněn.');
        router.refresh();
      } else {
        toast.error('Chyba při úpravě stavu faktury.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Došlo k neočekávané chybě.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Faktury techniků</h1>
        <p className="text-gray-400 text-sm">Zde spravujete a proplácíte faktury vašich techniků.</p>
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
            {requests.map(req => {
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
                        <a href={`/company/orders/${req.order.id}`} className="text-brand-yellow hover:underline">{req.order.readableId}</a>
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
                      req.status === 'REJECTED' ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-500"
                    )}>
                      {req.status === 'PENDING' ? 'ČEKÁ' : req.status === 'PAID' ? 'VYPLACENO' : req.status}
                    </span>
                    {req.status === 'PAID' && req.amountPaid && (
                      <div className="text-[10px] text-green-400 mt-1 font-bold">
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
            })}
            {requests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  Zatím žádné nahrané faktury
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
