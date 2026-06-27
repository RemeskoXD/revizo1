'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, CheckCircle2, XCircle, Send, Printer, Download, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

function czAccountToIban(account: string): string | null {
  try {
    const clean = account.replace(/\s/g, '');
    if (clean.startsWith('CZ') && clean.length === 24) return clean;

    const match = clean.match(/^(?:(\d{1,6})-)?(\d{2,10})\/(\d{4})$/);
    if (!match) return null;

    const prefix = match[1] ? match[1].padStart(6, '0') : '000000';
    const accNumber = match[2].padStart(10, '0');
    const bankCode = match[3];

    const bban = `${bankCode}${prefix}${accNumber}`;
    const checkString = `${bban}123500`;
    
    const mod = BigInt(checkString) % BigInt(97);
    const checkDigits = (BigInt(98) - mod).toString().padStart(2, '0');

    return `CZ${checkDigits}${bankCode}${prefix}${accNumber}`;
  } catch (e) {
    return null;
  }
}

export default function InvoicesClient({ invoices, technician }: any) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    if (!confirm(`Opravdu chcete změnit stav faktury na: ${newStatus === 'PAID' ? 'Zaplaceno' : 'Stornováno'}?`)) return;
    setLoadingId(id);
    try {
      const res = await fetch(`/api/technician/invoices/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Chyba při změně stavu');
      }
    } catch (e) {
      alert('Došlo k chybě');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReminder = async (id: string) => {
    if (!confirm('Opravdu chcete odeslat upomínku zákazníkovi na email?')) return;
    setLoadingId(`reminder-${id}`);
    try {
      const res = await fetch(`/api/technician/invoices/${id}/reminder`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Upomínka byla úspěšně odeslána zákazníkovi.');
      } else {
        alert('Chyba při odesílání upomínky');
      }
    } catch (e) {
      alert('Došlo k chybě');
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="flex items-center gap-1 text-xs font-medium bg-green-500/10 text-green-500 px-2 py-1 rounded-md border border-green-500/20"><CheckCircle2 className="w-3 h-3" /> Zaplaceno</span>;
      case 'CANCELLED':
        return <span className="flex items-center gap-1 text-xs font-medium bg-red-500/10 text-red-500 px-2 py-1 rounded-md border border-red-500/20"><XCircle className="w-3 h-3" /> Stornováno</span>;
      default:
        return <span className="flex items-center gap-1 text-xs font-medium bg-brand-yellow/10 text-brand-yellow px-2 py-1 rounded-md border border-brand-yellow/20"><Clock className="w-3 h-3" /> Nezapláceno</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Faktury</h1>
        <p className="text-gray-400 text-sm">Přehled vašich vystavených faktur zákazníkům.</p>
      </div>

      <div className="bg-[#111] rounded-xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-sm text-gray-400">
                <th className="p-4 font-semibold w-1/6">Číslo FA</th>
                <th className="p-4 font-semibold w-1/4">Odběratel</th>
                <th className="p-4 font-semibold text-right">Částka</th>
                <th className="p-4 font-semibold">Vystaveno / Splatnost</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {invoices.map((invoice: any) => (
                <tr key={invoice.id} className="hover:bg-white/5 transition-colors group">
                  <td className="p-4 text-white font-mono">{invoice.readableId}</td>
                  <td className="p-4">
                    <p className="text-white font-medium">{invoice.customer?.name || 'Neznámý'}</p>
                    <p className="text-xs text-gray-500 truncate max-w-[200px]">{invoice.customer?.address || invoice.customer?.email}</p>
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-bold text-brand-yellow">{invoice.price?.toLocaleString('cs-CZ')} Kč</span>
                  </td>
                  <td className="p-4">
                    <div className="text-gray-300">{invoice.completedAt ? new Date(invoice.completedAt).toLocaleDateString('cs-CZ') : '-'}</div>
                    <div className={cn("text-xs mt-0.5 font-medium", 
                      invoice.invoiceDueDate && new Date(invoice.invoiceDueDate) < new Date() && invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' 
                      ? "text-red-400" 
                      : "text-gray-500"
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
                      <div className="flex bg-[#1A1A1A] rounded-lg border border-white/5 p-1">
                        <Link 
                          href={`/api/orders/${invoice.readableId}/download?type=invoice`}
                          target="_blank"
                          title="Stáhnout fakturu"
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </Link>
                        <Link 
                          href={`/technician/job/${invoice.readableId}/invoice`}
                          target="_blank"
                          title="Zobrazit / Tisknout"
                          className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </Link>
                      </div>

                      {invoice.invoiceStatus !== 'PAID' && invoice.invoiceStatus !== 'CANCELLED' && (
                        <div className="flex gap-2">
                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleReminder(invoice.id)}
                            title="Odeslat upomínku na email"
                            className="p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          
                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleStatusUpdate(invoice.id, 'PAID')}
                            title="Označit jako zaplaceno"
                            className="p-2 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg border border-green-500/20 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>

                          <button
                            disabled={loadingId !== null}
                            onClick={() => handleStatusUpdate(invoice.id, 'CANCELLED')}
                            title="Stornovat fakturu"
                            className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors disabled:opacity-50"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Zatím nemáte žádné vystavené faktury.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
