'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Users, ChevronDown, ChevronUp, FileText, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { describePlatformFeeRules } from '@/lib/platform-commission';

export default function SettlementClient({ monthlyData, technicians }: any) {
  const [expandedMonth, setExpandedMonth] = useState(0);

  const currentMonth = monthlyData[0];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Vyúčtování a provize</h1>
        <p className="text-gray-400 text-sm">Přehled obratu, provizí techniků a zisku firmy za posledních 6 měsíců.</p>
      </div>

      <div className="flex gap-3 rounded-xl border border-brand-yellow/20 bg-brand-yellow/5 p-4 text-sm text-gray-300">
        <Info className="h-5 w-5 shrink-0 text-brand-yellow" />
        <div>
          <p className="font-medium text-white">Plánované pravidla provize platformy (Stripe)</p>
          <p className="mt-1 text-xs leading-relaxed text-gray-400">{describePlatformFeeRules()}</p>
        </div>
      </div>

      {/* Current month summary */}
      {currentMonth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
            <DollarSign className="w-5 h-5 text-brand-yellow mb-2" />
            <p className="text-3xl font-bold text-brand-yellow">{currentMonth.totalRevenue.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">Obrat – {currentMonth.label}</p>
          </div>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
            <Users className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-3xl font-bold text-white">{currentMonth.totalPayout.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500 mt-1">Výplaty technikům</p>
          </div>
          <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-5">
            <TrendingUp className="w-5 h-5 text-green-500 mb-2" />
            <p className="text-3xl font-bold text-green-500">{currentMonth.companyProfit.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500 mt-1">Zisk firmy</p>
          </div>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
            <FileText className="w-5 h-5 text-gray-400 mb-2" />
            <p className="text-3xl font-bold text-white">{currentMonth.orderCount}</p>
            <p className="text-xs text-gray-500 mt-1">Dokončených revizí</p>
          </div>
        </div>
      )}

      {/* Monthly Breakdown */}
      <div className="space-y-4">
        {monthlyData.map((month: any, idx: number) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.05 }}
            className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden"
          >
            <button onClick={() => setExpandedMonth(expandedMonth === idx ? -1 : idx)} className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-white capitalize w-40 text-left">{month.label}</span>
                <span className="text-xs text-gray-500">{month.orderCount} revizí</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-sm font-bold text-brand-yellow">{month.totalRevenue.toLocaleString('cs-CZ')} Kč</span>
                  <span className="text-xs text-gray-500 ml-2">obrat</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-500">{month.companyProfit.toLocaleString('cs-CZ')} Kč</span>
                  <span className="text-xs text-gray-500 ml-2">zisk</span>
                </div>
                {expandedMonth === idx ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {expandedMonth === idx && (
              <div className="border-t border-white/5 p-5">
                {month.perTechnician.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">Žádné dokončené zakázky v tomto měsíci.</p>
                ) : (
                  <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
                    <table className="w-full min-w-[520px] text-left text-sm">
                      <thead className="text-gray-500 border-b border-white/5 text-xs">
                        <tr>
                          <th className="pb-3 font-medium">Technik</th>
                          <th className="pb-3 font-medium text-center">Provize</th>
                          <th className="pb-3 font-medium text-center">Revizí</th>
                          <th className="pb-3 font-medium text-right">Obrat</th>
                          <th className="pb-3 font-medium text-right">Výplata technikovi</th>
                          <th className="pb-3 font-medium text-right">Zisk firmy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {month.perTechnician.map((tech: any) => (
                          <tr key={tech.techId} className="hover:bg-white/[0.02]">
                            <td className="py-3 text-white font-medium">{tech.techName}</td>
                            <td className="py-3 text-center text-gray-400">{tech.commissionRate}%</td>
                            <td className="py-3 text-center text-white">{tech.orderCount}</td>
                            <td className="py-3 text-right text-brand-yellow">{tech.revenue.toLocaleString('cs-CZ')} Kč</td>
                            <td className="py-3 text-right text-white font-medium">{tech.payout.toLocaleString('cs-CZ')} Kč</td>
                            <td className="py-3 text-right text-green-500 font-medium">{(tech.revenue - tech.payout).toLocaleString('cs-CZ')} Kč</td>
                          </tr>
                        ))}
                        <tr className="border-t-2 border-white/10 font-bold">
                          <td className="py-3 text-white">CELKEM</td>
                          <td className="py-3"></td>
                          <td className="py-3 text-center text-white">{month.orderCount}</td>
                          <td className="py-3 text-right text-brand-yellow">{month.totalRevenue.toLocaleString('cs-CZ')} Kč</td>
                          <td className="py-3 text-right text-white">{month.totalPayout.toLocaleString('cs-CZ')} Kč</td>
                          <td className="py-3 text-right text-green-500">{month.companyProfit.toLocaleString('cs-CZ')} Kč</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
