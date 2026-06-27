'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, DollarSign, Activity, Wallet, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface DailyData {
  date: string;
  revisions: number;
  subscriptions: number;
  flow: number;
}

interface FinancesData {
  totalFlow: number;
  subscriptionEarnings: number;
  revisionsEarnings: number;
  totalEarnings: number;
  chartData: DailyData[];
}

export default function FinancesClient() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancesData | null>(null);
  const [month, setMonth] = useState<string>(
    new Date().toISOString().slice(0, 7) // "YYYY-MM"
  );

  useEffect(() => {
    fetchData(month);
  }, [month]);

  const fetchData = async (selectedMonth: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/finances?month=${selectedMonth}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() - 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const d = new Date(`${month}-01`);
    d.setMonth(d.getMonth() + 1);
    setMonth(d.toISOString().slice(0, 7));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Finance projektu</h1>
          <p className="text-gray-400 text-sm mt-1">Přehled tržeb, cash flow a výdělků z revizí.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-[#111] p-1.5 rounded-xl border border-white/10">
          <button 
            onClick={handlePrevMonth}
            className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors"
          >
            ←
          </button>
          <div className="flex items-center gap-2 px-3 text-sm font-semibold text-white">
            <CalendarIcon className="w-4 h-4 text-brand-yellow" />
            {new Date(`${month}-01`).toLocaleDateString('cs-CZ', { month: 'long', year: 'numeric' })}
          </div>
          <button 
            onClick={handleNextMonth}
            className="px-3 py-1.5 hover:bg-white/5 rounded-lg text-sm text-gray-300 transition-colors"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-brand-yellow" />
        </div>
      ) : data ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#111] border border-white/5 p-5 rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Celkový obrat (Flow)</h3>
              </div>
              <p className="text-3xl font-bold text-white relative z-10">
                {data.totalFlow.toLocaleString('cs-CZ')} <span className="text-lg text-gray-500">Kč</span>
              </p>
            </div>

            <div className="bg-[#111] border border-white/5 p-5 rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-green-500/10 rounded-lg text-green-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Předplatné (Výdělek)</h3>
              </div>
              <p className="text-3xl font-bold text-white relative z-10">
                {data.subscriptionEarnings.toLocaleString('cs-CZ')} <span className="text-lg text-gray-500">Kč</span>
              </p>
            </div>

            <div className="bg-[#111] border border-white/5 p-5 rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Revize (Výdělek)</h3>
              </div>
              <p className="text-3xl font-bold text-white relative z-10">
                {data.revisionsEarnings.toLocaleString('cs-CZ')} <span className="text-lg text-gray-500">Kč</span>
              </p>
            </div>

            <div className="bg-brand-yellow/10 border border-brand-yellow/20 p-5 rounded-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-yellow/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-2 relative z-10">
                <div className="p-2 bg-brand-yellow/20 rounded-lg text-brand-yellow">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-brand-yellow uppercase tracking-wider">Celkový Zisk</h3>
              </div>
              <p className="text-3xl font-bold text-white relative z-10">
                {data.totalEarnings.toLocaleString('cs-CZ')} <span className="text-lg text-brand-yellow/70">Kč</span>
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#111] border border-white/5 rounded-xl p-6">
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-6">Měsíční vývoj</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                  <XAxis 
                    dataKey="date" 
                    stroke="#888" 
                    tickFormatter={(val) => new Date(val).getDate().toString()} 
                    tick={{fill: '#888', fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#888" 
                    tickFormatter={(val) => `${(val / 1000)}k`} 
                    tick={{fill: '#888', fontSize: 12}}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: '#222'}}
                    contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #333', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString('cs-CZ')}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="flow" name="Celkový Obrat (Flow)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="subscriptions" name="Předplatné" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revisions" name="Revize (Zisk)" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}
