'use client';

import { ShieldCheck, FileText, Download, Calendar, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const DEFAULT_INTERVAL_MONTHS = 36;

function getExpiration(order: any): Date {
  const date = order.completedAt ? new Date(order.completedAt) : new Date(order.updatedAt);
  const months = order.revisionCategory?.intervalMonths || DEFAULT_INTERVAL_MONTHS;
  const expires = new Date(date);
  expires.setMonth(expires.getMonth() + months);
  return expires;
}

function getCompletedDate(order: any): Date {
  return order.completedAt ? new Date(order.completedAt) : new Date(order.updatedAt);
}

export default function VaultClient({ completedOrders }: { completedOrders: any[] }) {
  const now = new Date();

  const expiredCount = completedOrders.filter(o => getExpiration(o) < now).length;
  const soonCount = completedOrders.filter(o => {
    const exp = getExpiration(o);
    const monthsLeft = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30);
    return monthsLeft > 0 && monthsLeft <= 6;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Trezor revizí</h1>
          <p className="text-gray-400">Bezpečné úložiště všech vašich revizních zpráv a dokumentů.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {expiredCount > 0 ? (
          <div className="bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500 text-white rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-red-500 font-medium">{expiredCount} {expiredCount === 1 ? 'revize expirovala' : 'revizí expirovalo'}</p>
                <p className="text-sm text-red-500/70">Objednejte novou revizi</p>
              </div>
            </div>
          </div>
        ) : soonCount > 0 ? (
          <div className="bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-500 text-white rounded-lg">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-orange-500 font-medium">{soonCount} {soonCount === 1 ? 'revize brzy vyprší' : 'revizí brzy vyprší'}</p>
                <p className="text-sm text-orange-500/70">Platnost do 6 měsíců</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-brand-yellow/20 to-brand-yellow/5 border border-brand-yellow/20 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-yellow text-black rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-brand-yellow font-medium">{completedOrders.length === 0 ? 'Žádné revize' : 'Všechny revize platné'}</p>
                <p className="text-sm text-brand-yellow/70">{completedOrders.length === 0 ? 'Zatím nemáte žádné dokončené revize' : 'Žádná revize neexpirovala'}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {completedOrders.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#1A1A1A] border border-white/5 rounded-xl">
            <p className="text-gray-500">Zatím nemáte žádné dokončené revize.</p>
          </div>
        ) : (
          completedOrders.map((order, index) => {
            const date = getCompletedDate(order);
            const expires = getExpiration(order);
            const isExpired = expires < now;
            const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isSoon = daysLeft > 0 && daysLeft <= 180;

            return (
              <Link key={order.id} href={`/dashboard/orders/${order.readableId}`} className="block">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={cn(
                    "group bg-[#1A1A1A] border rounded-xl p-5 transition-all hover:shadow-lg flex flex-col h-full",
                    isExpired ? "border-red-500/30 hover:border-red-500/50 hover:shadow-red-500/5" :
                    isSoon ? "border-orange-500/30 hover:border-orange-500/50 hover:shadow-orange-500/5" :
                    "border-white/5 hover:border-brand-yellow/50 hover:shadow-brand-yellow/5"
                  )}
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "p-3 rounded-lg transition-colors",
                          isExpired ? "bg-red-500/10 text-red-500" :
                          isSoon ? "bg-orange-500/10 text-orange-500" :
                          "bg-white/5 text-gray-400 group-hover:bg-brand-yellow group-hover:text-black"
                        )}>
                            <FileText className="w-6 h-6" />
                        </div>
                        {isExpired ? (
                          <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">EXPIROVÁNO</span>
                        ) : isSoon ? (
                          <span className="text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded">BRZY VYPRŠÍ</span>
                        ) : (
                          <span className="text-xs font-mono text-gray-500 bg-black/20 px-2 py-1 rounded">PLATNÉ</span>
                        )}
                    </div>
                    
                    <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-brand-yellow transition-colors">
                      {order.serviceType}
                    </h3>
                    <p className="text-xs text-gray-600 mb-1 truncate">{order.address}</p>
                    {order.revisionCategory && (
                      <p className="text-xs text-gray-500">{order.revisionCategory.name}</p>
                    )}
                    <div className="space-y-2 mt-4 flex-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>Dokončeno: {date.toLocaleDateString('cs-CZ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <ShieldCheck className="w-4 h-4" />
                            <span>Platnost do: <span className={cn(
                              isExpired ? "text-red-500" :
                              isSoon ? "text-orange-500" :
                              "text-green-500"
                            )}>{expires.toLocaleDateString('cs-CZ')}</span></span>
                        </div>
                        {isExpired ? (
                          <p className="text-xs text-red-400 mt-1">Expirováno před {Math.abs(daysLeft)} dny</p>
                        ) : (
                          <p className="text-xs text-gray-500 mt-1">Zbývá {daysLeft} dní</p>
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {order.reportFile ? 'Dostupné' : 'Zatím nenahráno'}
                        </span>
                        {order.reportFile ? (
                          <span onClick={(e) => { e.preventDefault(); window.open(`/api/orders/${order.readableId}/download`); }} className="flex items-center gap-2 text-sm font-medium text-white hover:text-brand-yellow transition-colors cursor-pointer">
                              <Download className="w-4 h-4" /> Stáhnout
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600 flex items-center gap-2">
                            <Download className="w-4 h-4" /> Nedostupné
                          </span>
                        )}
                    </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
