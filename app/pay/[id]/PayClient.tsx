'use client';

import { DollarSign, FileText, CheckCircle2, ShieldCheck, MapPin, Search } from 'lucide-react';
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
        <div className="max-w-md w-full bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-8 text-center text-white">
           <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <CheckCircle2 className="w-8 h-8 text-green-500" />
           </div>
           <h1 className="text-2xl font-bold text-green-500 mb-2">Zaplaceno</h1>
           <p className="text-gray-400">Revize #{order.readableId} byla v pořádku uhrazena.</p>
           <p className="text-sm font-medium text-white mt-4">{order.serviceType}</p>
        </div>
      </div>
    );
  }

  // Generate generic SPAYD string
  // Format: SPD*1.0*ACC:CZxx*AM:1000.00*CC:CZK*X-VS:12345678*MSG:Revize
  // Using a fallback IBAN if not configured in the system.
  const fallbackIban = 'CZ0000000000000000000000';
  const amountStr = Number(order.price).toFixed(2);
  const vs = order.readableId;
  const spayd = `SPD*1.0*ACC:${fallbackIban}*AM:${amountStr}*CC:CZK*X-VS:${vs}*MSG:Revize ${order.readableId}`;

  const handleCardPayment = async () => {
    try {
      const res = await fetch(`/api/orders/${order.readableId}/checkout`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } else {
        alert('Platba kartou online momentálně není definována. Použijte QR kód.');
      }
    } catch {
      alert('Chyba platební brány.');
    }
  };

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
                 const isOverdue = order.completedAt ? new Date().getTime() - new Date(order.completedAt).getTime() > 14 * 24 * 60 * 60 * 1000 : false;
                 return isOverdue ? (
                   <span className="px-3 py-1 bg-red-500/10 text-red-500 text-xs font-bold rounded-full uppercase tracking-wider">
                     Po splatnosti
                   </span>
                 ) : (
                   <span className="px-3 py-1 bg-brand-yellow/10 text-brand-yellow text-xs font-bold rounded-full uppercase tracking-wider">
                     Splatné do 14 dnů
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

          <div className="p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center border-t border-white/5">
            
            {/* SPAYD QR */}
            <div className="flex flex-col items-center">
              <p className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider text-center">Platba přes mobilní banku</p>
              <div className="bg-white p-3 rounded-xl shadow-xl">
                <QRCodeSVG value={spayd} size={150} level="M" />
              </div>
              <p className="text-xs text-brand-yellow mt-4 flex items-center gap-1.5"><Search className="w-3.5 h-3.5"/> Naskenujte v bankovní aplikaci</p>
            </div>

            <div className="hidden md:block w-px h-full bg-white/5 mx-auto"></div>

            {/* Alternativy */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider md:text-left text-center">Rychlá on-line platba</p>
              <button 
                onClick={handleCardPayment}
                className="w-full py-3.5 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-colors shadow-lg shadow-brand-yellow/10 flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                Zaplatit kartou online
              </button>
              <div className="text-xs text-gray-500 text-center leading-relaxed">
                Platba kartou pomocí Google Pay, Apple Pay nebo platební brány.
              </div>
            </div>

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
