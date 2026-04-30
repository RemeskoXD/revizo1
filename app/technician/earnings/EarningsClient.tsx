'use client';

import { DollarSign, TrendingUp, FileText, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { useState } from 'react';

export default function EarningsClient({ monthlyData, totalEarnings, totalCount, commissionRate }: any) {
  const [expandedMonth, setExpandedMonth] = useState<number>(0);

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
                        <span className="text-gray-500 truncate max-w-[200px]">{order.address}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {order.completedAt && (
                          <span className="text-gray-500">{new Date(order.completedAt).toLocaleDateString('cs-CZ')}</span>
                        )}
                        <span className="font-bold text-brand-yellow">{((order.price || 0) * commissionRate / 100).toLocaleString('cs-CZ')} Kč</span>
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
