'use client';

import { 
  Users, FileText, DollarSign, CheckCircle2, Clock, AlertTriangle, 
  XCircle, ArrowRight, TrendingUp, Shield, Download
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

const statusLabel = (s: string) => ({
  'COMPLETED': 'Dokončeno', 'IN_PROGRESS': 'Probíhá', 'NEEDS_REVISION': 'Výhrady',
  'CANCELLED': 'Zrušeno',
}[s] || 'Nová');

const statusColor = (s: string) => ({
  'COMPLETED': 'bg-green-500/10 text-green-500',
  'IN_PROGRESS': 'bg-blue-500/10 text-blue-500',
  'NEEDS_REVISION': 'bg-orange-500/10 text-orange-500',
  'CANCELLED': 'bg-red-500/10 text-red-500',
}[s] || 'bg-yellow-500/10 text-yellow-500');

export default function AdminDashboardClient({
  totalUsers, totalOrders, completedOrders, pendingOrders, inProgressOrders,
  cancelledOrders, monthlyRevenue, conversionRate, cancelRate,
  unassignedCount, pendingRoleRequests, recentOrders, redFlagTechnicians, userRole,
}: any) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Admin Dashboard</h1>
          <p className="text-sm text-gray-400">Celkový přehled platformy Revizone.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <a href="/api/admin/export/orders?status=all" download className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10">
            <Download className="h-4 w-4 shrink-0" /> Export CSV
          </a>
          {userRole === 'ADMIN' && (
            <Link href="/admin/settings" className="flex items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20">
              <Shield className="h-4 w-4 shrink-0" /> Nastavení
            </Link>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(unassignedCount > 0 || pendingRoleRequests > 0 || redFlagTechnicians.length > 0) && (
        <div className="flex flex-wrap gap-3">
          {unassignedCount > 0 && (
            <Link href="/admin/orders" className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" /> {unassignedCount} nepřiřazených zakázek
            </Link>
          )}
          {pendingRoleRequests > 0 && (
            <Link href="/admin/roles" className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-xs font-medium hover:bg-blue-500/20 transition-colors">
              <Users className="w-3.5 h-3.5" /> {pendingRoleRequests} žádostí o roli
            </Link>
          )}
          {redFlagTechnicians.map((t: any) => (
            <Link key={t.id} href="/admin/users" className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-xs font-medium hover:bg-orange-500/20 transition-colors">
              <AlertTriangle className="w-3.5 h-3.5" /> ⚠️ {t.name}: {t.cancelRate}% zrušených
            </Link>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Users className="w-4 h-4 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-white">{totalUsers}</p>
            <p className="text-xs text-gray-500">Uživatelů</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.12}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <FileText className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-white">{totalOrders}</p>
            <p className="text-xs text-gray-500">Zakázek celkem</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.14}>
          <div className="bg-[#1A1A1A] border border-brand-yellow/20 rounded-xl p-4">
            <DollarSign className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-brand-yellow">{monthlyRevenue.toLocaleString('cs-CZ')}</p>
            <p className="text-xs text-gray-500">Obrat tento měsíc</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.16}>
          <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-4">
            <TrendingUp className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-500">{conversionRate}%</p>
            <p className="text-xs text-gray-500">Úspěšnost</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.18}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Clock className="w-4 h-4 text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-white">{pendingOrders + inProgressOrders}</p>
            <p className="text-xs text-gray-500">Aktivních</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", cancelRate > 15 ? "border-red-500/20" : "border-white/5")}>
            <XCircle className={cn("w-4 h-4 mb-2", cancelRate > 15 ? "text-red-500" : "text-gray-500")} />
            <p className={cn("text-2xl font-bold", cancelRate > 15 ? "text-red-500" : "text-white")}>{cancelRate}%</p>
            <p className="text-xs text-gray-500">Zrušených</p>
          </div>
        </AnimatedItem>
      </div>

      {/* Conversion Funnel */}
      <AnimatedItem delay={0.25}>
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Konverzní trychtýř zakázek</h3>
          <div className="table-scroll -mx-1 px-1 sm:mx-0 sm:px-0">
            <div className="flex h-24 min-w-[280px] items-end gap-2">
            {[
              { label: 'Nové', count: pendingOrders, color: 'bg-yellow-500' },
              { label: 'Probíhá', count: inProgressOrders, color: 'bg-blue-500' },
              { label: 'Dokončeno', count: completedOrders, color: 'bg-green-500' },
              { label: 'Zrušeno', count: cancelledOrders, color: 'bg-red-500' },
            ].map((step) => {
              const maxCount = Math.max(pendingOrders, inProgressOrders, completedOrders, cancelledOrders, 1);
              const height = Math.max((step.count / maxCount) * 100, 5);
              return (
                <div key={step.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-bold text-white">{step.count}</span>
                  <div className="w-full rounded-t-lg transition-all" style={{ height: `${height}%` }}>
                    <div className={cn("h-full w-full rounded-t-lg", step.color)} />
                  </div>
                  <span className="text-[10px] text-gray-500">{step.label}</span>
                </div>
              );
            })}
            </div>
          </div>
        </div>
      </AnimatedItem>

      {/* Recent Orders */}
      <AnimatedItem delay={0.3}>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-semibold text-white">Poslední zakázky</h3>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/api/admin/export/orders?status=COMPLETED" download className="flex items-center gap-1 text-xs text-gray-400 hover:text-brand-yellow">
                <Download className="h-3 w-3" /> Export hotových
              </a>
              <Link href="/admin/orders" className="text-xs text-brand-yellow hover:underline">Vše →</Link>
            </div>
          </div>
          <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-gray-500 border-b border-white/5 text-xs">
                <tr>
                  <th className="pb-2 font-medium">ID</th>
                  <th className="pb-2 font-medium">Typ</th>
                  <th className="pb-2 font-medium">Zákazník</th>
                  <th className="pb-2 font-medium">Technik</th>
                  <th className="pb-2 font-medium">Stav</th>
                  <th className="pb-2 font-medium text-right">Datum</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5"><Link href={`/dashboard/orders/${order.readableId}`} className="font-mono text-xs text-gray-500 hover:text-brand-yellow">#{order.readableId}</Link></td>
                    <td className="py-2.5 text-white text-xs">{order.serviceType}</td>
                    <td className="py-2.5 text-gray-400 text-xs">{order.customer?.name || order.customer?.email || '–'}</td>
                    <td className="py-2.5 text-xs">{order.technician?.name || <span className="text-red-400">–</span>}</td>
                    <td className="py-2.5"><span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusColor(order.status))}>{statusLabel(order.status)}</span></td>
                    <td className="py-2.5 text-xs text-gray-500 text-right">{new Date(order.createdAt).toLocaleDateString('cs-CZ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </AnimatedItem>
    </div>
  );
}
