'use client';

import { Home, ShieldCheck, AlertTriangle, Clock, Send, ArrowRight, MapPin, FileText, Plus, XCircle } from 'lucide-react';
import Link from 'next/link';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

const HEALTH_CONFIG = {
  green: { label: 'OK', bg: 'bg-green-500', border: 'border-green-500/30', text: 'text-green-500', dot: 'bg-green-500' },
  orange: { label: 'Brzy vyprší', bg: 'bg-orange-500', border: 'border-orange-500/30', text: 'text-orange-500', dot: 'bg-orange-500 animate-pulse' },
  red: { label: 'Expirováno', bg: 'bg-red-500', border: 'border-red-500/30', text: 'text-red-500', dot: 'bg-red-500' },
  unknown: { label: 'Bez revizí', bg: 'bg-gray-500', border: 'border-gray-500/30', text: 'text-gray-500', dot: 'bg-gray-500' },
};

export default function RealtyDashboardClient({
  userName, properties, pendingTransfers, greenCount, redCount, orangeCount,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio nemovitostí</h1>
          <p className="text-gray-400 text-sm">Vítejte, {userName}</p>
        </div>
        <div className="flex gap-3">
          {pendingTransfers > 0 && (
            <Link href="/realty/transfers" className="px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-medium rounded-lg hover:bg-green-500/20 transition-colors flex items-center gap-2">
              <Send className="w-4 h-4" /> {pendingTransfers} čekajících převodů
            </Link>
          )}
          <Link href="/realty/properties" className="px-4 py-2 bg-brand-yellow text-black text-sm font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Přidat nemovitost
          </Link>
        </div>
      </div>

      {/* Health Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Home className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-white">{properties.length}</p>
            <p className="text-xs text-gray-500">Nemovitostí celkem</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.15}>
          <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
            <ShieldCheck className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-500">{greenCount}</p>
            <p className="text-xs text-gray-500">Vše v pořádku</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", orangeCount > 0 ? "border-orange-500/20" : "border-white/5")}>
            <AlertTriangle className={cn("w-4 h-4 mb-2", orangeCount > 0 ? "text-orange-500" : "text-gray-500")} />
            <p className={cn("text-2xl font-bold", orangeCount > 0 ? "text-orange-500" : "text-white")}>{orangeCount}</p>
            <p className="text-xs text-gray-500">Brzy vyprší</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.25}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", redCount > 0 ? "border-red-500/20" : "border-white/5")}>
            <XCircle className={cn("w-4 h-4 mb-2", redCount > 0 ? "text-red-500" : "text-gray-500")} />
            <p className={cn("text-2xl font-bold", redCount > 0 ? "text-red-500" : "text-white")}>{redCount}</p>
            <p className="text-xs text-gray-500">Expirované revize</p>
          </div>
        </AnimatedItem>
      </div>

      {/* Alert */}
      {redCount > 0 && (
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium text-sm">{redCount} {redCount === 1 ? 'nemovitost má' : 'nemovitostí má'} expirované revize!</p>
            <p className="text-xs text-gray-400 mt-1">Nemovitosti s propadlými revizemi nejsou bezpečné k prodeji. Objednejte nové revize.</p>
          </div>
        </div>
      )}

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
          <Home className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Žádné nemovitosti</h3>
          <p className="text-gray-500 mb-6">Přidejte svou první nemovitost a začněte spravovat její revize.</p>
          <Link href="/realty/properties" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
            <Plus className="w-5 h-5" /> Přidat nemovitost
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((p: any, idx: number) => {
            const cfg = HEALTH_CONFIG[p.health as keyof typeof HEALTH_CONFIG];
            return (
              <AnimatedItem key={p.id} delay={0.1 + idx * 0.05}>
                <Link href={`/realty/properties/${p.id}`} className="block group">
                  <div className={cn("bg-[#1A1A1A] border rounded-xl p-5 transition-all hover:shadow-lg", cfg.border, "hover:border-brand-yellow/30")}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-3 h-3 rounded-full shrink-0", cfg.dot)} />
                        <h3 className="text-sm font-semibold text-white group-hover:text-brand-yellow transition-colors truncate">{p.name}</h3>
                      </div>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", `${cfg.bg}/10`, cfg.text)}>{cfg.label}</span>
                    </div>

                    {p.address && (
                      <p className="text-xs text-gray-500 mb-3 truncate"><MapPin className="w-3 h-3 inline mr-1" />{p.address}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-[#111] rounded-lg p-2">
                        <p className="text-sm font-bold text-white">{p.completedOrders}</p>
                        <p className="text-[10px] text-gray-500">Revizí</p>
                      </div>
                      <div className="bg-[#111] rounded-lg p-2">
                        <p className="text-sm font-bold text-white">{p.activeOrders}</p>
                        <p className="text-[10px] text-gray-500">Aktivní</p>
                      </div>
                      <div className="bg-[#111] rounded-lg p-2">
                        <p className={cn("text-sm font-bold", p.expiredCount > 0 ? "text-red-500" : "text-green-500")}>{p.expiredCount}</p>
                        <p className="text-[10px] text-gray-500">Expirováno</p>
                      </div>
                    </div>

                    {p.transferStatus === 'CLAIMED' && (
                      <div className="mt-3 text-xs text-green-400 bg-green-500/5 border border-green-500/20 rounded-lg p-2 text-center">
                        Čeká na potvrzení převodu → {p.claimedBy?.name || p.claimedBy?.email}
                      </div>
                    )}
                  </div>
                </Link>
              </AnimatedItem>
            );
          })}
        </div>
      )}
    </div>
  );
}
