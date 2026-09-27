'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, Send, Printer, Download, Clock, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function InvoicesClient({ invoices }: any) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    const isPaid = newStatus === 'PAID';
    const msg = isPaid ? 'Označit fakturu jako zaplacenou?' : 'Opravdu stornovat tuto fakturu?';
    if (!window.confirm(msg)) return;
    
    setLoadingId(id);
    try {
      const res = await fetch(`/api/technician/invoices/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        toast.success(isPaid ? 'Faktura označena jako zaplacená.' : 'Faktura byla stornována.');
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error('Chyba při změně stavu faktury.');
      }
    } catch {
      toast.error('Došlo k chybě při komunikaci se serverem.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReminder = async (id: string) => {
    if (!window.confirm('Odeslat zákazníkovi e-mailovou upomínku k platbě?')) return;
    setLoadingId(`reminder-${id}`);
    try {
      const res = await fetch(`/api/technician/invoices/${id}/reminder`, {
        method: 'POST',
      });
      if (res.ok) {
        toast.success('Upomínka byla úspěšně odeslána zákazníkovi.');
      } else {
        toast.error('Chyba při odesílání upomínky.');
      }
    } catch {
      toast.error('Došlo k neočekávané chybě.');
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Zaplaceno
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-500/10 text-red-400 px-2.5 py-1 rounded-full border border-red-500/20">
            <XCircle className="w-3.5 h-3.5" /> Stornováno
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-500/10 text-brand-yellow px-2.5 py-1 rounded-full border border-brand-yellow/20">
            <Clock className="w-3.5 h-3.5" /> K úhradě
          </span>
        );
    }
  };

  const filteredInvoices = (invoices || []).filter((inv: any) => {
    const status = inv.invoiceStatus || 'UNPAID';
    if (filterStatus === 'PAID' && status !== 'PAID') return false;
    if (filterStatus === 'UNPAID' && (status === 'PAID' || status === 'CANCELLED')) return false;
    if (filterStatus === 'CANCELLED' && status !== 'CANCELLED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.readableId?.toLowerCase().includes(q);
      const matchCustomer = inv.customer?.name?.toLowerCase().includes(q) || inv.customer?.email?.toLowerCase().includes(q);
      if (!matchNum && !matchCustomer) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Vystavené faktury</h1>
          <p className="text-neutral-400 text-sm mt-1">Správa plateb a dokladů pro koncové zákazníky.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/60 p-2 sm:p-3 rounded-2xl border border-white/10">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'Všechny' },
            { id: 'UNPAID', label: 'K úhradě' },
            { id: 'PAID', label: 'Zaplaceno' },
            { id: 'CANCELLED', label: 'Storno' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={cn(
                "min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95",
                filterStatus === tab.id 
                  ? "bg-brand-yellow text-black shadow-sm" 
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Hledat fakturu nebo zákazníka..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#141414] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 min-h-[40px] text-xs text-white placeholder-neutral-500 focus:border-brand-yellow outline-none"
          />
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-[#141414] rounded-2xl border border-white/10 overflow-hidden shadow-sm">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-neutral-400">
            <Filter className="w-8 h-8 mx-auto text-neutral-600 mb-2" />
            <p className="text-sm font-medium">Nebyly nalezeny žádné faktury.</p>
            <p className="text-xs text-neutral-500 mt-1">Zkuste změnit filtr nebo vyhledávání.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-neutral-400 bg-white/[0.02]">
                    <th className="p-4 font-semibold">Číslo dokladu</th>
                    <th className="p-4 font-semibold">Odběratel</th>
                    <th className="p-4 font-semibold text-right">Částka</th>
                    <th className="p-4 font-semibold">Vystaveno / Splatnost</th>
                    <th className="p-4 font-semibold text-center">Status</th>
                    <th className="p-4 font-semibold text-right">Akce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {filteredInvoices.map((invoice: any) => (
                    <tr key={invoice.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-4 text-white font-mono font-medium">{invoice.readableId}</td>
                      <td className="p-4">
                        <p className="text-white font-medium">{invoice.customer?.name || 'Neznámý'}</p>
                        <p className="text-xs text-neutral-400 truncate max-w-[220px]">{invoice.customer?.address || invoice.customer?.email}</p>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-bold text-brand-yellow">{invoice.price?.toLocaleString('cs-CZ')} Kč</span>
                      </td>
                      <td className="p-4">
                        <div className="text-neutral-300">{invoice.completedAt ? new Date(invoice.completedAt).toLocaleDateString('cs-CZ') : '-'}</div>
                        <div className={cn("text-xs mt-0.5 font-medium", 
                          invoice.invoiceDueDate && new Date(invoice.invoiceDueDate) < new Date() && invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' 
                            ? "text-red-400" 
                            : "text-neutral-500"
                        )}>
                          Splatnost: {invoice.invoiceDueDate ? new Date(invoice.invoiceDueDate).toLocaleDateString('cs-CZ') : 'Nenastavena'}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(invoice.invoiceStatus || 'UNPAID')}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <div className="flex bg-[#1E1E1E] rounded-xl border border-white/10 p-1">
                            {invoice.invoiceFile && (
                              <Link 
                                href={`/api/orders/${invoice.readableId}/download?type=invoice`}
                                target="_blank"
                                title="Stáhnout PDF"
                                className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </Link>
                            )}
                            <Link 
                              href={`/technician/job/${invoice.readableId}/invoice`}
                              target="_blank"
                              title="Tisk / Zobrazení"
                              className="p-2 text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </Link>
                          </div>

                          {invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' && (
                            <div className="flex gap-1.5">
                              <button
                                disabled={loadingId !== null}
                                onClick={() => handleReminder(invoice.id)}
                                title="Odeslat upomínku na email"
                                className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl border border-blue-500/20 transition disabled:opacity-50"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                              
                              <button
                                disabled={loadingId !== null}
                                onClick={() => handleStatusUpdate(invoice.id, 'PAID')}
                                title="Označit jako zaplaceno"
                                className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl border border-emerald-500/20 transition disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              <button
                                disabled={loadingId !== null}
                                onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                                title="Stornovat fakturu"
                                className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl border border-red-500/20 transition disabled:opacity-50"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Apple Cards */}
            <div className="md:hidden divide-y divide-white/5">
              {filteredInvoices.map((invoice: any) => (
                <div key={invoice.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-white">{invoice.readableId}</span>
                    {getStatusBadge(invoice.invoiceStatus || 'UNPAID')}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-white">{invoice.customer?.name || 'Neznámý odběratel'}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5 truncate">{invoice.customer?.address || invoice.customer?.email}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
                    <div className="text-neutral-400">
                      <span>Vystaveno: {invoice.completedAt ? new Date(invoice.completedAt).toLocaleDateString('cs-CZ') : '-'}</span>
                      {invoice.invoiceDueDate && (
                        <div className={cn("mt-0.5 font-medium", 
                          new Date(invoice.invoiceDueDate) < new Date() && invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' 
                            ? "text-red-400" 
                            : "text-neutral-500"
                        )}>
                          Splatnost: {new Date(invoice.invoiceDueDate).toLocaleDateString('cs-CZ')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-base font-bold text-brand-yellow">
                        {invoice.price?.toLocaleString('cs-CZ')} Kč
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar for Mobile (min 44px touch targets) */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link
                      href={`/technician/job/${invoice.readableId}/invoice`}
                      target="_blank"
                      className="flex-1 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                    >
                      <Printer className="w-4 h-4 text-neutral-300" />
                      Faktura / Tisk
                    </Link>

                    {invoice.invoiceFile && (
                      <Link
                        href={`/api/orders/${invoice.readableId}/download?type=invoice`}
                        target="_blank"
                        className="min-h-[44px] min-w-[44px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl flex items-center justify-center transition active:scale-95"
                        title="Stáhnout PDF"
                      >
                        <Download className="w-4 h-4" />
                      </Link>
                    )}

                    {invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' && (
                      <>
                        <button
                          disabled={loadingId !== null}
                          onClick={() => handleReminder(invoice.id)}
                          className="min-h-[44px] min-w-[44px] bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 flex items-center justify-center transition active:scale-95 disabled:opacity-50"
                          title="Odeslat upomínku"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button
                          disabled={loadingId !== null}
                          onClick={() => handleStatusUpdate(invoice.id, 'PAID')}
                          className="min-h-[44px] px-3 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Zaplaceno
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
