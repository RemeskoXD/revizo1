'use client';

import { DollarSign, TrendingUp, FileText, Calendar, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

export default function EarningsClient({ monthlyData, totalEarnings, totalCount, commissionRate, payoutRequests = [], technician }: any) {
  const [expandedMonth, setExpandedMonth] = useState<number>(0);
  const [isRequesting, setIsRequesting] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState<'upload' | 'generate'>('upload');
  
  const [amount, setAmount] = useState('');
  const [orderId, setOrderId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [iban, setIban] = useState(technician?.bankAccount || '');
  const [notes, setNotes] = useState('');
  const [invoiceData, setInvoiceData] = useState<string>('');
  const [invoiceFileName, setInvoiceFileName] = useState('');
  const [busy, setBusy] = useState(false);

  // Invoice generator state
  const [invoiceItems, setInvoiceItems] = useState<{name: string, qty: number, price: number}[]>([]);
  const invoiceRef = useRef<HTMLDivElement>(null);

  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setInvoiceFileName(file.name);

    try {
      const { compressImage, fileToBase64 } = await import('@/lib/client-compress');
      const compressed = await compressImage(file);
      const b64 = await fileToBase64(compressed);
      setInvoiceData(b64);
      toast.success('Soubor faktury úspěšně načten');
    } catch (err) {
      console.error(err);
      toast.error('Při zpracování souboru došlo k chybě.');
    }
  };
  
  const handleOrderChange = (id: string) => {
    setOrderId(id);
    if (!id) {
      setInvoiceItems([]);
      setAmount('');
      return;
    }
    const order = monthlyData.flatMap((m: any) => m.orders).find((o: any) => o.id === id);
    if (order) {
      setInvoiceItems([{ name: `Revize: ${order.readableId} - ${order.address}`, qty: 1, price: order.earnings }]);
      setAmount(order.earnings.toString());
    }
  };

  const handleUpdateItem = (index: number, field: string, value: any) => {
    const newItems = [...invoiceItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceItems(newItems);
    
    // Auto-update amount
    const total = newItems.reduce((sum, item) => sum + (item.qty * item.price), 0);
    setAmount(total.toString());
  };

  const generatePDF = async () => {
    if (!invoiceRef.current) return null;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(invoiceRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/jpeg', 0.8);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      return pdf.output('datauristring');
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);

    let finalInvoiceData = invoiceData;
    if (invoiceMode === 'generate') {
      const generated = await generatePDF();
      if (!generated) {
        toast.error('Chyba při generování faktury.');
        setBusy(false);
        return;
      }
      finalInvoiceData = generated;
    }

    if (!finalInvoiceData) {
      toast.error('Prosím nahrajte fakturu nebo ji vygenerujte.');
      setBusy(false);
      return;
    }

    try {
      const res = await fetch('/api/technician/payout-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(amount), iban, notes, invoiceData: finalInvoiceData, orderId, dueDate }),
      });
      if (res.ok) {
        toast.success('Žádost o výplatu byla úspěšně odeslána.');
        setTimeout(() => window.location.reload(), 700);
      } else {
        toast.error('Chyba při nahrávání faktury a odesílání žádosti.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Chyba při komunikaci se serverem.');
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
    </div>
  );
}
