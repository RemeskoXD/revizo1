'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, Plus, FileText, Calendar, MapPin, Clock, Building,
  ChevronRight, ShieldCheck, AlertTriangle, XCircle, CalendarClock
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

type OrderItem = {
  id: string;
  readableId: string;
  serviceType: string;
  propertyType: string;
  status: string;
  address: string;
  notes: string | null;
  preferredDate: string | null;
  scheduledDate: string | null;
  completedAt: string | null;
  createdAt: string;
  categoryName: string | null;
  intervalMonths: number | null;
  daysLeft: number | null;
  revisionStatus: string;
};

type BuildingType = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  createdAt: string;
};

export default function BuildingDetailClient({
  building, orders: initialOrders
}: {
  building: BuildingType;
  orders: OrderItem[];
}) {
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    serviceType: 'Elektroinstalace - společné prostory',
    propertyType: 'Bytový dům',
    notes: '',
    preferredDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;
  const activeCount = orders.filter(o => ['PENDING', 'IN_PROGRESS'].includes(o.status)).length;
  const expiredCount = orders.filter(o => o.revisionStatus === 'expired').length;
  const warningCount = orders.filter(o => o.revisionStatus === 'warning').length;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${building.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          address: building.address || building.name,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setOrders([{
          ...created,
          categoryName: null,
          intervalMonths: null,
          daysLeft: null,
          revisionStatus: 'active',
        }, ...orders]);
        setIsAddModalOpen(false);
        setNewOrder({ serviceType: 'Elektroinstalace - společné prostory', propertyType: 'Bytový dům', notes: '', preferredDate: '' });
      } else {
        alert('Chyba při vytváření revize');
      }
    } catch {
      alert('Chyba při vytváření revize');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <Link href="/svj/buildings" className="shrink-0 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group mt-1">
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                  <Building className="w-5 h-5 text-rose-400" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{building.name}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-3">
                {building.address && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    {building.address}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Přidáno {new Date(building.createdAt).toLocaleDateString('cs-CZ')}
                </div>
              </div>
              {building.description && (
                <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-3xl">{building.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 min-w-[280px]">
            <div className="bg-[#111] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xl font-bold text-white">{orders.length}</p>
              <p className="text-[10px] text-gray-500 uppercase">Celkem</p>
            </div>
            <div className="bg-[#111] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xl font-bold text-green-500">{completedCount}</p>
              <p className="text-[10px] text-gray-500 uppercase">Dokončeno</p>
            </div>
            <div className="bg-[#111] rounded-xl p-3 text-center border border-white/5">
              <p className="text-xl font-bold text-cyan-400">{activeCount}</p>
              <p className="text-[10px] text-gray-500 uppercase">Aktivní</p>
            </div>
            <div className={cn("bg-[#111] rounded-xl p-3 text-center border", expiredCount > 0 ? "border-red-500/20" : "border-white/5")}>
              <p className={cn("text-xl font-bold", expiredCount > 0 ? "text-red-500" : "text-white")}>{expiredCount}</p>
              <p className="text-[10px] text-gray-500 uppercase">Expirováno</p>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}
      {(expiredCount > 0 || warningCount > 0) && (
        <AnimatedItem delay={0.1}>
          <div className={cn(
            "p-4 rounded-xl border flex items-start gap-3",
            expiredCount > 0 ? "bg-red-500/5 border-red-500/20" : "bg-orange-500/5 border-orange-500/20"
          )}>
            <AlertTriangle className={cn("w-5 h-5 shrink-0 mt-0.5", expiredCount > 0 ? "text-red-500" : "text-orange-500")} />
            <div>
              {expiredCount > 0 && (
                <p className="text-red-400 font-medium text-sm">
                  {expiredCount} {expiredCount === 1 ? 'revize je' : 'revizí je'} po platnosti! Objednejte nové revize pro bezpečnost domu.
                </p>
              )}
              {warningCount > 0 && (
                <p className="text-orange-400 text-sm mt-1">
                  {warningCount} {warningCount === 1 ? 'revize brzy vyprší' : 'revizí brzy vyprší'} (do 90 dní).
                </p>
              )}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Orders section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-yellow" />
            Revize budovy
            <span className="bg-white/10 text-gray-300 py-0.5 px-2.5 rounded-full text-xs font-medium ml-2">{orders.length}</span>
          </h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nová revize
          </button>
        </div>

        <div className="space-y-3">
          {orders.map((order, index) => (
            <AnimatedItem key={order.id} delay={index * 0.05}>
              <Link href={`/svj/orders/${order.readableId}`} className="block group">
                <div className={cn(
                  "bg-[#111] border rounded-xl p-4 flex items-center gap-4 transition-all hover:shadow-lg hover:border-brand-yellow/30",
                  order.revisionStatus === 'expired' ? "border-red-500/20" :
                  order.revisionStatus === 'warning' ? "border-orange-500/20" :
                  "border-white/10"
                )}>
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    order.status === 'COMPLETED' ?
                      (order.revisionStatus === 'expired' ? "bg-red-500/10" : order.revisionStatus === 'warning' ? "bg-orange-500/10" : "bg-green-500/10") :
                      order.status === 'IN_PROGRESS' ? "bg-blue-500/10" : "bg-brand-yellow/10"
                  )}>
                    {order.status === 'COMPLETED' ? (
                      order.revisionStatus === 'expired' ? <XCircle className="w-5 h-5 text-red-500" /> :
                      order.revisionStatus === 'warning' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> :
                      <ShieldCheck className="w-5 h-5 text-green-500" />
                    ) : (
                      <Clock className="w-5 h-5 text-brand-yellow" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white group-hover:text-brand-yellow transition-colors">{order.serviceType}</span>
                      <span className="text-[10px] text-gray-500 font-mono">#{order.readableId}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{order.categoryName || order.propertyType}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {order.status === 'COMPLETED' && order.daysLeft !== null && (
                      <div className="flex items-center gap-1.5 text-right">
                        <CalendarClock className={cn("w-3.5 h-3.5",
                          order.revisionStatus === 'expired' ? "text-red-500" :
                          order.revisionStatus === 'warning' ? "text-orange-500" : "text-gray-500"
                        )} />
                        <span className={cn("text-xs font-medium",
                          order.revisionStatus === 'expired' ? "text-red-400" :
                          order.revisionStatus === 'warning' ? "text-orange-400" : "text-gray-400"
                        )}>
                          {order.daysLeft <= 0 ? `Expirováno` : `${order.daysLeft}d`}
                        </span>
                      </div>
                    )}

                    <span className={cn("text-xs font-medium px-2 py-1 rounded-full",
                      order.status === 'COMPLETED' ? "bg-green-500/10 text-green-500" :
                      order.status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-500" :
                      order.status === 'CANCELLED' ? "bg-red-500/10 text-red-500" :
                      "bg-brand-yellow/10 text-brand-yellow"
                    )}>
                      {order.status === 'COMPLETED' ? 'Dokončeno' :
                       order.status === 'IN_PROGRESS' ? 'Probíhá' :
                       order.status === 'CANCELLED' ? 'Zrušeno' : 'Čeká'}
                    </span>

                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-brand-yellow transition-colors" />
                  </div>
                </div>
              </Link>
            </AnimatedItem>
          ))}

          {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4 bg-[#111] border border-white/5 rounded-2xl text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Žádné revize</h3>
              <p className="text-gray-400 text-sm max-w-md mb-8">
                Tato budova zatím nemá žádné revize. Objednejte první revizi společných prostor.
              </p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Objednat první revizi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New order modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-yellow" />
                Nová revize
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Typ revize</label>
                <select
                  value={newOrder.serviceType}
                  onChange={e => setNewOrder({ ...newOrder, serviceType: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                >
                  <option value="Elektroinstalace - společné prostory">Elektroinstalace – společné prostory</option>
                  <option value="Elektroinstalace - Bytový dům">Elektroinstalace – bytový dům</option>
                  <option value="Plynové zařízení">Plynové zařízení</option>
                  <option value="Hromosvod">Hromosvod</option>
                  <option value="Komíny">Komíny</option>
                  <option value="Hasicí přístroje">Hasicí přístroje</option>
                  <option value="Požární bezpečnost">Požární bezpečnost</option>
                  <option value="Výtahy">Výtahy</option>
                  <option value="Tlaková zařízení">Tlaková zařízení</option>
                  <option value="Komplexní revize">Komplexní revize celého domu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Preferovaný termín (volitelné)</label>
                <input
                  type="date"
                  value={newOrder.preferredDate}
                  onChange={e => setNewOrder({ ...newOrder, preferredDate: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Poznámka (volitelné)</label>
                <textarea
                  placeholder="Upřesněte požadavky – přístup do společných prostor, kontakt na správce..."
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all min-h-[120px] resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold rounded-xl transition-all shadow-lg shadow-brand-yellow/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? 'Vytvářím...' : 'Objednat revizi'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
