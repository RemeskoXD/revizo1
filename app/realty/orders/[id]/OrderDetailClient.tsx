'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Clock, FileText, Home, User, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

type Order = any;

export default function OrderDetailClient({ order }: { order: Order }) {
  const [status, setStatus] = useState(order.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setStatus(newStatus);
      } else {
        alert('Chyba při změně stavu');
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při změně stavu');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <Link href={`/realty/properties/${order.propertyId}`} className="shrink-0 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group mt-1">
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center border border-brand-yellow/20">
                  <FileText className="w-5 h-5 text-brand-yellow" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{order.serviceType}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ml-3 ${
                  status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                  status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                  status === 'NEEDS_REVISION' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                  status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                  'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
                }`}>
                  {status === 'COMPLETED' ? 'Dokončeno' :
                   status === 'IN_PROGRESS' ? 'Probíhá' :
                   status === 'NEEDS_REVISION' ? 'K přepracování' :
                   status === 'CANCELLED' ? 'Zrušeno' : 'Čeká na vyřízení'}
                </span>
              </div>
              <p className="text-gray-400 font-mono text-sm mb-4">#{order.readableId}</p>
              
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-gray-500" />
                  {order.propertyType}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {order.address}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Vytvořeno {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-3 min-w-[200px]">
            <p className="text-sm font-semibold text-gray-400 mb-1">Změnit stav:</p>
            <select
              value={status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={isUpdating}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all disabled:opacity-50"
            >
              <option value="PENDING">Čeká na vyřízení</option>
              <option value="IN_PROGRESS">Probíhá</option>
              <option value="NEEDS_REVISION">K přepracování</option>
              <option value="COMPLETED">Dokončeno</option>
              <option value="CANCELLED">Zrušeno</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Notes Section */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Poznámky k revizi
            </h2>
            {order.notes ? (
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            ) : (
              <p className="text-gray-500 italic">Žádné poznámky nebyly zadány.</p>
            )}
          </div>
          
          {/* Checklist placeholder (for future) */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-gray-400" />
              Kontrolní seznam
            </h2>
            <div className="p-8 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-8 h-8 text-gray-500 mb-3" />
              <p className="text-gray-400 text-sm">Kontrolní seznam bude brzy dostupný.</p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Zákazník</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                <User className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="text-white font-medium">{order.customer?.name || 'Neznámý'}</p>
                <p className="text-sm text-gray-500">{order.customer?.email}</p>
              </div>
            </div>
          </div>

          {/* Property Info */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Nemovitost</h3>
            <Link href={`/realty/properties/${order.property.id}`} className="group block">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10 group-hover:bg-brand-yellow/10 group-hover:border-brand-yellow/20 transition-colors shrink-0">
                  <Home className="w-5 h-5 text-gray-400 group-hover:text-brand-yellow transition-colors" />
                </div>
                <div>
                  <p className="text-white font-medium group-hover:text-brand-yellow transition-colors line-clamp-1">{order.property.name}</p>
                  <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{order.property.address}</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Timing Info */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Termíny</h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Preferovaný termín</p>
                <div className="flex items-center gap-2 text-white">
                  <Calendar className="w-4 h-4 text-brand-yellow" />
                  {order.preferredDate ? new Date(order.preferredDate).toLocaleDateString('cs-CZ') : 'Nespecifikováno'}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Vytvořeno</p>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {new Date(order.createdAt).toLocaleString('cs-CZ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
