'use client';

import { useMemo, useState } from 'react';
import { 
  Activity, 
  Search, 
  X, 
  User, 
  Clock, 
  ShieldAlert, 
  CheckCircle, 
  FileText,
  DollarSign,
  Filter
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export default function AdminHistoryClient({ logs }: { logs: any[] }) {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'USER' | 'ORDER' | 'PAYOUT' | 'SECURITY'>('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const act = (log.action || '').toUpperCase();
      if (actionFilter === 'USER' && !act.includes('USER') && !act.includes('ROLE') && !act.includes('REGISTR')) return false;
      if (actionFilter === 'ORDER' && !act.includes('ORDER') && !act.includes('ZAKAZ')) return false;
      if (actionFilter === 'PAYOUT' && !act.includes('PAY') && !act.includes('VYPLAT') && !act.includes('FAKTUR')) return false;
      if (actionFilter === 'SECURITY' && !act.includes('BAN') && !act.includes('DELETE') && !act.includes('REJECT') && !act.includes('AUTH')) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const userName = (log.user?.name || '').toLowerCase();
      const userEmail = (log.user?.email || '').toLowerCase();
      const userRole = (log.user?.role || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      return userName.includes(q) || userEmail.includes(q) || userRole.includes(q) || action.includes(q) || details.includes(q);
    });
  }, [logs, search, actionFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Auditní historie & Systémový log
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Záznam všech důležitých akcí, změn rolí, schválení, plateb a administrátorských zásahů.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat v historii podle jména, e-mailu, akce nebo detailu…"
            className="w-full min-h-[44px] rounded-2xl border border-white/10 bg-[#161616] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              title="Vymazat vyhledávání"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Action Tabs (iOS Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-[#161616] p-1 text-xs">
          {[
            { id: 'all', label: `Všechny záznamy (${logs.length})` },
            { id: 'USER', label: 'Uživatelé & Role' },
            { id: 'ORDER', label: 'Zakázky' },
            { id: 'PAYOUT', label: 'Výplaty' },
            { id: 'SECURITY', label: 'Zabezpečení & Schvalování' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActionFilter(tab.id as any)}
              className={cn(
                "min-h-[36px] rounded-xl px-3 py-1.5 font-semibold transition-all whitespace-nowrap",
                actionFilter === tab.id
                  ? 'bg-brand-yellow text-black font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Cards (Phones & Small Tablets) */}
      <div className="space-y-3 lg:hidden">
        {filteredLogs.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center text-sm text-gray-500">
            {search || actionFilter !== 'all' ? 'Žádné záznamy neodpovídají zadanému filtru.' : 'Zatím žádná historie.'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-brand-yellow">
                  {log.action}
                </span>
                <span className="text-[11px] text-gray-500 flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3" />
                  {new Date(log.createdAt).toLocaleString('cs-CZ')}
                </span>
              </div>

              {log.details && (
                <p className="text-xs text-gray-300 bg-black/40 p-2.5 rounded-xl border border-white/5 leading-relaxed">
                  {log.details}
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-white/5">
                <div className="flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-white font-medium truncate">{log.user?.name || log.user?.email || 'Systém'}</span>
                </div>
                {log.user?.role && (
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/5 text-gray-400">
                    {log.user.role}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#111] text-gray-400 border-b border-white/10 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 font-semibold w-44">Datum & Čas</th>
                <th className="px-5 py-4 font-semibold w-56">Uživatel</th>
                <th className="px-5 py-4 font-semibold w-52">Akce</th>
                <th className="px-5 py-4 font-semibold">Podrobnosti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-gray-500">
                    {search || actionFilter !== 'all' ? 'Žádné záznamy neodpovídají zadanému filtru.' : 'Zatím žádná historie.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.3) }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-400 font-mono">
                      {new Date(log.createdAt).toLocaleString('cs-CZ')}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white text-xs">{log.user?.name || log.user?.email || 'Systém'}</div>
                      <div className="text-[11px] text-gray-500">{log.user?.email} • <span className="font-mono text-gray-400">{log.user?.role}</span></div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 font-mono text-xs font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-300 max-w-md truncate">
                      {log.details || '–'}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
