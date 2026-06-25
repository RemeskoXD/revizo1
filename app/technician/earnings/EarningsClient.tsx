'use client';

import { DollarSign, TrendingUp, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function EarningsClient({ monthlyData, totalEarnings, totalCount, commissionRate, payoutRequests = [] }: any) {
  const [expandedMonth, setExpandedMonth] = useState<number>(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [amount, setAmount] = useState('');
  const [iban, setIban] = useState('');
  const [notes, setNotes] = useState('');
  const [invoiceData, setInvoiceData] = useState<string>('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [busy, setBusy] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setInvoiceData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };
  
  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/technician/payout-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), iban, notes, invoiceData }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Chyba při žádosti o výplatu');
      }
    } catch (err) {
      console.error(err);
      alert('Chyba serveru');
    } finally {
      setBusy(false);
    }
  };

  const maxEarnings = Math.max(...monthlyData.map((m: any) => m.earnings), 1);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Výdělky</h1>
        <p className="text-gray-400 text-sm">Přehled vašich příjmů za posledních 6 měsíců. Provize: {commissionRate}%</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#1A1A1A] border border-brand-yellow/20 rounded-xl p-5">
          <DollarSign className="w-5 h-5 text-brand-yellow mb-2" />
          <p className="text-3xl font-bold text-brand-yellow">{totalEarnings.toLocaleString('cs-CZ')} Kč</p>
          <p className="text-xs text-gray-500 mt-1">Celkem za 6 měsíců</p>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
          <FileText className="w-5 h-5 text-blue-500 mb-2" />
          <p className="text-3xl font-bold text-white">{totalCount}</p>
          <p className="text-xs text-gray-500 mt-1">Dokončených revizí</p>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
          <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
          <p className="text-3xl font-bold text-white">{totalCount > 0 ? Math.round(totalEarnings / totalCount).toLocaleString('cs-CZ') : 0} Kč</p>
          <p className="text-xs text-gray-500 mt-1">Průměr na revizi</p>
        </div>
      </div>

      {/* Monthly Bars */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Měsíční přehled</h3>
        <div className="space-y-3">
          {monthlyData.map((month: any, idx: number) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.05 }}
            >
              <button 
                onClick={() => setExpandedMonth(expandedMonth === idx ? -1 : idx)}
                className="w-full"
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-400 w-32 text-left capitalize">{month.label}</span>
                  <div className="flex-1 h-8 bg-[#111] rounded-lg overflow-hidden relative">
                    <div 
                      className={cn(
                        "h-full rounded-lg transition-all duration-500",
                        idx === 0 ? "bg-brand-yellow" : "bg-brand-yellow/60"
                      )}
                      style={{ width: `${Math.max((month.earnings / maxEarnings) * 100, 2)}%` }}
                    />
                    <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-white">
                      {month.count > 0 ? `${month.count} revizí` : ''}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-white w-28 text-right">{month.earnings.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </button>

              {/* Expanded month detail */}
              {expandedMonth === idx && month.orders.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="ml-36 mt-2 space-y-1"
                >
                  {month.orders.map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-2 bg-[#111] rounded border border-white/5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-600">#{order.readableId}</span>
                        <span className="text-white">{order.serviceType}</span>
                        <span className="text-gray-500 truncate max-w-[150px]">{order.address}</span>
                        {order.isReferredByMe && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-brand-yellow/20 text-brand-yellow uppercase tracking-wider font-bold">Doporučení</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {order.completedAt && (
                          <span className="text-gray-500">{new Date(order.completedAt).toLocaleDateString('cs-CZ')}</span>
                        )}
                        <span className="font-bold text-brand-yellow">{Math.round(order.earnings || 0).toLocaleString('cs-CZ')} Kč</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Payouts Section */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Žádosti o výplatu (Můj tiket)</h3>
          <button 
            onClick={() => setIsRequesting(!isRequesting)}
            className="px-4 py-2 bg-brand-yellow text-black text-sm font-semibold rounded-lg hover:bg-yellow-400"
          >
            Požádat o výplatu
          </button>
        </div>

        {isRequesting && (
          <form onSubmit={handleRequestPayout} className="bg-[#111] border border-white/10 rounded-lg p-4 mb-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Částka (Kč) *</label>
              <input 
                type="number" 
                required 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white border border-white/10 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Číslo účtu / IBAN</label>
              <input 
                type="text" 
                value={iban} 
                onChange={e => setIban(e.target.value)}
                placeholder="Nepovinné, pokud již máme Váš účet"
                className="w-full bg-[#1A1A1A] text-white border border-white/10 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Poznámka pro admina</label>
              <input 
                type="text" 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                className="w-full bg-[#1A1A1A] text-white border border-white/10 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Faktura (PDF nebo obrázek)</label>
              <input 
                type="file" 
                accept="application/pdf,image/*"
                onChange={handleFileChange}
                className="w-full bg-[#1A1A1A] text-white border border-white/10 rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-yellow file:text-black hover:file:bg-yellow-400"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsRequesting(false)} 
                className="px-4 py-2 text-white hover:text-gray-300 font-medium text-sm"
              >
                Zrušit
              </button>
              <button 
                type="submit" 
                disabled={busy}
                className="px-4 py-2 bg-brand-yellow text-black font-bold text-sm rounded-lg hover:bg-yellow-400 disabled:opacity-50"
              >
                {busy ? 'Odesílám...' : 'Odeslat žádost'}
              </button>
            </div>
          </form>
        )}

        {payoutRequests.length > 0 ? (
          <div className="space-y-3">
            {payoutRequests.map((req: any) => (
              <div key={req.id} className="flex justify-between items-center p-4 bg-[#111] rounded-lg border border-white/5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">{req.amount.toLocaleString('cs-CZ')} Kč</span>
                    <span className={cn(
                      "text-xs font-semibold px-2 py-1 rounded-md",
                      req.status === 'PENDING' ? "bg-blue-500/10 text-blue-400" :
                      req.status === 'PAID' ? "bg-green-500/10 text-green-400" :
                      req.status === 'REJECTED' ? "bg-red-500/10 text-red-500" : "bg-gray-500/10 text-gray-400"
                    )}>
                      {req.status === 'PENDING' ? 'ČEKÁ (do 7 dnů)' : req.status === 'PAID' ? 'VYPLACENO' : req.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">Založeno: {new Date(req.createdAt).toLocaleDateString('cs-CZ')} | Účet: {req.iban || 'Nespecifikován'}</span>
                  {req.notes && <span className="text-xs text-gray-400 mt-1">Poznámka: {req.notes}</span>}
                  {req.invoiceUrl && (
                    <a href={req.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline mt-1">
                      Zobrazit nahranou fakturu
                    </a>
                  )}
                </div>
                {req.paidAt && (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-green-500 font-medium whitespace-nowrap">Vyplaceno: {new Date(req.paidAt).toLocaleDateString('cs-CZ')}</span>
                    {req.amountPaid && <span className="text-sm font-bold text-green-400">({req.amountPaid.toLocaleString('cs-CZ')} Kč)</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 text-gray-500 text-sm">Žádné žádosti o výplatu</div>
        )}
      </div>

    </div>
  );
}
