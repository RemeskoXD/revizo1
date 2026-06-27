'use client';

import { DollarSign, FileText, CheckCircle2, ShieldCheck, MapPin, Search, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import Link from 'next/link';

export function PayClient({ order }: { order: any }) {

  if (!order.price || order.price <= 0) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1A1A1A] border border-white/5 rounded-2xl p-8 text-center text-white">
           <ShieldCheck className="w-12 h-12 text-brand-yellow mx-auto mb-4" />
           <h1 className="text-xl font-bold mb-2">Žádná platba není vyžadována</h1>
           <p className="text-gray-400">Tato revize nevyžaduje žádnou platbu nebo již byla vyřešena.</p>
        </div>
      </div>
    );
  }

  if (order.isPaid) {
    return (
      <div className="min-h-dvh bg-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-[#1A1A1A] border border-green-500/30 rounded-3xl p-8 text-center shadow-[0_0_40px_rgba(34,197,94,0.1)] relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-green-500" />
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Faktura uhrazena</h1>
          <p className="text-gray-400 mb-8">
            Děkujeme. Platba za revizi byla úspěšně přijata. Vaše revizní dokumenty jsou nyní k dispozici.
          </p>
          <div className="space-y-3">
            {order.reportFile && (
              <a 
                href={`/api/orders/${order.readableId}/download`}
                download
                className="w-full py-3.5 bg-green-500 text-black font-bold rounded-xl hover:bg-green-400 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Stáhnout revizní zprávu
              </a>
            )}
            {order.invoiceFile && (
              <a 
                href={`/api/orders/${order.readableId}/download?type=invoice`}
                download
                className="w-full py-3.5 bg-white/5 border border-white/10 text-white font-bold rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Stáhnout fakturu
              </a>
            )}
            <Link 
              href="/dashboard"
              className="block w-full py-3 text-sm text-gray-400 hover:text-white transition-colors mt-4"
            >
              Zpět do aplikace
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-black flex flex-col items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-yellow font-bold text-black shadow-lg shadow-brand-yellow/20">R</div>
          <span className="text-2xl font-bold text-white tracking-tight">Revizone</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          {/* Header Info */}
          <div className="p-6 border-b border-white/5">
            <div className="flex justify-between items-center mb-4">
              {(() => {
                 const dueDate = order.invoiceDueDate ? new Date(order.invoiceDueDate) : (order.completedAt ? new Date(new Date(order.completedAt).getTime() + 14 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000));
                 const isOverdue = new Date().getTime() > dueDate.getTime();
                 return isOverdue ? (
                   <span className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                     Po splatnosti
                   </span>
                 ) : (
                   <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow text-xs font-bold rounded-full uppercase tracking-wider">
                     Splatné do {dueDate.toLocaleDateString('cs-CZ')}
                   </span>
                 );
              })()}
              <span className="text-gray-500 font-mono text-sm">#{order.readableId}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{order.serviceType}</h2>
            <div className="flex items-center gap-2 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{order.address}</span>
            </div>
          </div>

          {/* Amount Box */}
          <div className="p-8 text-center bg-[#111]">
            <p className="text-sm text-gray-500 mb-2 uppercase tracking-wider font-semibold">Částka k úhradě</p>
            <div className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {order.price.toLocaleString('cs-CZ')} <span className="text-2xl text-gray-500">Kč</span>
            </div>
          </div>

          <div className="p-6 md:p-8 flex flex-col items-center border-t border-white/5 text-center">
            
            <p className="text-gray-400 mb-6">
              Platbu proveďte přímo technikovi podle pokynů na faktuře, kterou vystavil.
            </p>
            
            {order.invoiceFile ? (
              <a 
                href={`/api/orders/${order.readableId}/download?type=invoice`}
                download
                className="w-full py-3.5 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-colors shadow-lg shadow-brand-yellow/10 flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Stáhnout fakturu k proplacení
              </a>
            ) : (
               <div className="text-gray-500">
                 Technik zatím nenahrál fakturu.
               </div>
            )}
            
            <Link 
              href="/dashboard"
              className="block w-full py-3 text-sm text-gray-500 hover:text-white transition-colors mt-6"
            >
              Zpět do aplikace
            </Link>

          </div>
        </motion.div>

        {/* Footer info */}
        <p className="text-center text-xs text-gray-600 mt-8">
           Tato stránka slouží jako oficiální podklad pro provedení úhrady. <br className="hidden sm:block" />
           Revizone © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
