'use client';

import { 
  FileText, Users, DollarSign, AlertTriangle, Radio, 
  ChevronRight, MapPin, Clock, CheckCircle2, UserPlus
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

const statusLabel = (s: string) => ({
  'COMPLETED': 'Dokončeno', 'IN_PROGRESS': 'Probíhá', 'NEEDS_REVISION': 'K přepracování',
  'CANCELLED': 'Zrušeno',
}[s] || 'Nová');

const statusColor = (s: string) => ({
  'COMPLETED': 'bg-green-500/10 text-green-500',
  'IN_PROGRESS': 'bg-blue-500/10 text-blue-500',
  'NEEDS_REVISION': 'bg-orange-500/10 text-orange-500',
  'CANCELLED': 'bg-red-500/10 text-red-500',
}[s] || 'bg-yellow-500/10 text-yellow-500');

export default function CompanyDashboardClient({
  companyName, technicians, activeOrders, monthlyRevenue, monthlyCount,
  unassignedCount, publicOrders, recentOrders, joinRequestsCount
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Řídící centrum</h1>
          <p className="text-sm text-gray-400">{companyName}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <Link href="/company/radar" className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10">
            <Radio className="h-4 w-4 shrink-0" /> Radar poptávek
          </Link>
          <Link href="/company/orders" className="flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover">
            <FileText className="h-4 w-4 shrink-0" /> Všechny zakázky
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {(unassignedCount > 0 || joinRequestsCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {unassignedCount > 0 && (
            <Link href="/company/orders" className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors">
              <AlertTriangle className="w-4 h-4" /> {unassignedCount} zakázek bez technika
            </Link>
          )}
          {joinRequestsCount > 0 && (
            <Link href="/company/technicians" className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors">
              <UserPlus className="w-4 h-4" /> {joinRequestsCount} žádostí o připojení
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <FileText className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-white">{activeOrders}</p>
            <p className="text-xs text-gray-500">Aktivních zakázek</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.15}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Users className="w-4 h-4 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-white">{technicians.length}</p>
            <p className="text-xs text-gray-500">Techniků</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className="bg-[#1A1A1A] border border-brand-yellow/20 rounded-xl p-4">
            <DollarSign className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-brand-yellow">{monthlyRevenue.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500">Obrat tento měsíc</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.25}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <CheckCircle2 className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-white">{monthlyCount}</p>
            <p className="text-xs text-gray-500">Revizí tento měsíc</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.3}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Radio className="w-4 h-4 text-orange-500 mb-2" />
            <p className="text-2xl font-bold text-white">{publicOrders.length}</p>
            <p className="text-xs text-gray-500">Volných poptávek</p>
          </div>
        </AnimatedItem>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Technician Workload */}
        <AnimatedItem delay={0.3} className="lg:col-span-1">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Users className="w-4 h-4 text-blue-500" /> Workload techniků</h3>
              <Link href="/company/technicians" className="text-xs text-brand-yellow hover:underline">Správa →</Link>
            </div>
            <div className="space-y-3">
              {technicians.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">Zatím nemáte žádné techniky.</p>
              ) : (
                technicians.map((tech: any) => {
                  const activeCount = tech.assignedOrders.length;
                  const maxLoad = 5;
                  const loadPercent = Math.min((activeCount / maxLoad) * 100, 100);
                  return (
                    <Link href={`/company/technicians/${tech.id}`} key={tech.id} className="block p-3 bg-[#111] rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">{tech.name || tech.email}</span>
                        <span className="text-xs text-gray-500">{activeCount} zakázek</span>
                      </div>
                      <div className="h-1.5 bg-[#0a0a0a] rounded-full overflow-hidden">
                        <div className={cn("h-full rounded-full transition-all", 
                          loadPercent >= 80 ? "bg-red-500" : loadPercent >= 50 ? "bg-orange-500" : "bg-green-500"
                        )} style={{ width: `${Math.max(loadPercent, 5)}%` }} />
                      </div>
                      {tech.assignedOrders.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {tech.assignedOrders.slice(0, 2).map((o: any) => (
                            <div key={o.id} className="flex items-center justify-between text-[10px]">
                              <span className="text-gray-400 truncate">{o.serviceType} – {o.address}</span>
                              <span className={cn("px-1 py-0.5 rounded font-medium", statusColor(o.status))}>{statusLabel(o.status)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </AnimatedItem>

        {/* Recent Orders */}
        <AnimatedItem delay={0.4} className="lg:col-span-2">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><FileText className="w-4 h-4 text-brand-yellow" /> Poslední zakázky</h3>
              <Link href="/company/orders" className="text-xs text-brand-yellow hover:underline">Vše →</Link>
            </div>
            <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-gray-500 border-b border-white/5 text-xs">
                  <tr>
                    <th className="pb-2 font-medium">ID</th>
                    <th className="pb-2 font-medium">Typ</th>
                    <th className="pb-2 font-medium">Zákazník</th>
                    <th className="pb-2 font-medium">Technik</th>
                    <th className="pb-2 font-medium">Cena</th>
                    <th className="pb-2 font-medium">Stav</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentOrders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2.5">
                        <Link href={`/company/orders/${order.readableId}`} className="font-mono text-xs text-gray-500 hover:text-brand-yellow">#{order.readableId}</Link>
                      </td>
                      <td className="py-2.5 text-white text-xs">{order.serviceType}</td>
                      <td className="py-2.5 text-gray-400 text-xs">{order.customer?.name || '–'}</td>
                      <td className="py-2.5 text-xs">
                        {order.technician ? (
                          <span className="text-white">{order.technician.name}</span>
                        ) : (
                          <span className="text-red-400 text-[10px] font-medium">Nepřiřazeno</span>
                        )}
                      </td>
                      <td className="py-2.5 text-brand-yellow text-xs font-medium">{order.price ? `${order.price.toLocaleString('cs-CZ')} Kč` : '–'}</td>
                      <td className="py-2.5"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusColor(order.status))}>{statusLabel(order.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </AnimatedItem>
      </div>

      {/* Public Orders Radar Preview */}
      {publicOrders.length > 0 && (
        <AnimatedItem delay={0.5}>
          <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2"><Radio className="w-4 h-4 text-orange-500 animate-pulse" /> Volné poptávky na trhu</h3>
              <Link href="/company/radar" className="text-xs text-brand-yellow hover:underline">Radar →</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {publicOrders.slice(0, 3).map((order: any) => (
                <Link href={`/company/orders/${order.readableId}`} key={order.id} className="p-3 bg-[#111] rounded-lg border border-white/5 hover:border-orange-500/30 transition-all group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white group-hover:text-orange-400 transition-colors">{order.serviceType}</span>
                    <span className="text-xs font-bold text-brand-yellow">{order.price ? `${order.price.toLocaleString('cs-CZ')} Kč` : '–'}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate"><MapPin className="w-3 h-3 inline" /> {order.address}</p>
                  <p className="text-[10px] text-gray-600 mt-1"><Clock className="w-3 h-3 inline" /> {new Date(order.createdAt).toLocaleDateString('cs-CZ')}</p>
                </Link>
              ))}
            </div>
          </div>
        </AnimatedItem>
      )}
    </div>
  );
}
