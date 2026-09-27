'use client';

import { 
  Users, 
  FileText, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  TrendingUp, 
  Shield, 
  Download,
  UserPlus,
  UserCheck,
  HelpCircle,
  Package,
  Calendar,
  Sparkles,
  MapPin,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const statusLabel = (s: string) => ({
  'COMPLETED': 'Dokončeno', 
  'IN_PROGRESS': 'Probíhá', 
  'NEEDS_REVISION': 'Výhrady',
  'CANCELLED': 'Zrušeno',
}[s] || 'Nová');

const statusColor = (s: string) => ({
  'COMPLETED': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  'IN_PROGRESS': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  'NEEDS_REVISION': 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
  'CANCELLED': 'bg-red-500/10 text-red-400 border border-red-500/20',
}[s] || 'bg-amber-500/10 text-amber-400 border border-amber-500/20');

export default function AdminDashboardClient({
  totalUsers, 
  totalOrders, 
  completedOrders, 
  pendingOrders, 
  inProgressOrders,
  cancelledOrders, 
  monthlyRevenue, 
  conversionRate, 
  cancelRate,
  unassignedCount, 
  pendingRoleRequests, 
  pendingRegistrationsCount = 0,
  openTicketsCount = 0,
  recentOrders, 
  redFlagTechnicians = [], 
  userRole,
}: any) {
  const needsAttention = unassignedCount > 0 || pendingRegistrationsCount > 0 || pendingRoleRequests > 0 || openTicketsCount > 0 || redFlagTechnicians.length > 0;

  return (
    <div className="space-y-6 pb-8">
      {/* Header with Title and Quick Global Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Přehled platformy Revizone a rychlé operační řízení.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <a
            href="/api/admin/export/orders?status=all"
            download
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
          >
            <Download className="h-4 w-4 shrink-0 text-brand-yellow" />
            <span>Export CSV</span>
          </a>

          {userRole === 'ADMIN' && (
            <Link
              href="/admin/settings"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              <Shield className="h-4 w-4 shrink-0 text-gray-400" />
              <span>Nastavení</span>
            </Link>
          )}
        </div>
      </div>

      {/* OPERATIONS ACTION CENTER: "Vyžaduje pozornost" */}
      {needsAttention && (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a1a1e] to-[#141416] p-4 sm:p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                Operační centrum – Vyžaduje pozornost
              </h2>
            </div>
            <span className="text-[11px] text-gray-500 font-medium">Klikněte pro vyřešení</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {unassignedCount > 0 && (
              <Link
                href="/admin/orders"
                className="group flex min-h-[50px] items-center justify-between rounded-xl border border-red-500/20 bg-red-500/10 p-3 transition-all hover:bg-red-500/15 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/20 text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-red-200">
                      {unassignedCount} nepřiřazených zakázek
                    </p>
                    <p className="text-[11px] text-red-400/80">Přiřadit techniky</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-red-400 transition-transform group-hover:translate-x-1" />
              </Link>
            )}

            {pendingRegistrationsCount > 0 && (
              <Link
                href="/admin/registrations"
                className="group flex min-h-[50px] items-center justify-between rounded-xl border border-brand-yellow/20 bg-brand-yellow/10 p-3 transition-all hover:bg-brand-yellow/15 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/20 text-brand-yellow">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-amber-100">
                      {pendingRegistrationsCount} nových registrací
                    </p>
                    <p className="text-[11px] text-amber-400/80">Schválit účty</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-brand-yellow transition-transform group-hover:translate-x-1" />
              </Link>
            )}

            {pendingRoleRequests > 0 && (
              <Link
                href="/admin/roles"
                className="group flex min-h-[50px] items-center justify-between rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 transition-all hover:bg-blue-500/15 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-blue-100">
                      {pendingRoleRequests} žádostí o roli
                    </p>
                    <p className="text-[11px] text-blue-400/80">Zkontrolovat oprávnění</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-blue-400 transition-transform group-hover:translate-x-1" />
              </Link>
            )}

            {openTicketsCount > 0 && (
              <Link
                href="/admin/support"
                className="group flex min-h-[50px] items-center justify-between rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 transition-all hover:bg-purple-500/15 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                    <HelpCircle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-purple-100">
                      {openTicketsCount} otevřených tiketů
                    </p>
                    <p className="text-[11px] text-purple-400/80">Odpovědět na dotazy</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-purple-400 transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>

          {redFlagTechnicians.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-white/5">
              {redFlagTechnicians.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/admin/users?search=${encodeURIComponent(t.name || '')}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-500/20 bg-orange-500/10 px-2.5 py-1 text-xs text-orange-400 hover:bg-orange-500/20"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{t.name}: <strong>{t.cancelRate}%</strong> zrušených zakázek</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Link 
          href="/admin/users"
          className="group rounded-2xl border border-white/10 bg-[#161616] p-4 transition-all hover:border-white/25 hover:bg-[#1c1c1e] active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="h-4 w-4 text-blue-400" />
            <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-white transition-colors" />
          </div>
          <p className="text-2xl font-extrabold text-white">{totalUsers}</p>
          <p className="text-xs text-gray-400 mt-0.5">Uživatelů celkem</p>
        </Link>

        <Link 
          href="/admin/orders"
          className="group rounded-2xl border border-white/10 bg-[#161616] p-4 transition-all hover:border-white/25 hover:bg-[#1c1c1e] active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <FileText className="h-4 w-4 text-brand-yellow" />
            <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-white transition-colors" />
          </div>
          <p className="text-2xl font-extrabold text-white">{totalOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">Zakázek celkem</p>
        </Link>

        <Link 
          href="/admin/finances"
          className="group rounded-2xl border border-brand-yellow/30 bg-[#181816] p-4 transition-all hover:border-brand-yellow/50 hover:bg-[#20201c] active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-4 w-4 text-brand-yellow" />
            <ArrowRight className="h-3 w-3 text-brand-yellow/50 group-hover:text-brand-yellow transition-colors" />
          </div>
          <p className="text-2xl font-extrabold text-brand-yellow">
            {monthlyRevenue.toLocaleString('cs-CZ')}
          </p>
          <p className="text-xs font-medium text-brand-yellow/80 mt-0.5">Tržby za měsíc (Kč)</p>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#161616] p-4">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              KPI
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400">{conversionRate}%</p>
          <p className="text-xs text-gray-400 mt-0.5">Úspěšnost dokončení</p>
        </div>

        <Link 
          href="/admin/orders"
          className="group rounded-2xl border border-white/10 bg-[#161616] p-4 transition-all hover:border-white/25 hover:bg-[#1c1c1e] active:scale-[0.98]"
        >
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-white transition-colors" />
          </div>
          <p className="text-2xl font-extrabold text-white">{pendingOrders + inProgressOrders}</p>
          <p className="text-xs text-gray-400 mt-0.5">Běžících zakázek</p>
        </Link>

        <div className={cn("rounded-2xl border p-4", cancelRate > 15 ? "border-red-500/30 bg-red-500/5" : "border-white/10 bg-[#161616]")}>
          <div className="flex items-center justify-between mb-2">
            <XCircle className={cn("h-4 w-4", cancelRate > 15 ? "text-red-400" : "text-gray-400")} />
            {cancelRate > 15 && (
              <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                Pozor
              </span>
            )}
          </div>
          <p className={cn("text-2xl font-extrabold", cancelRate > 15 ? "text-red-400" : "text-white")}>
            {cancelRate}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Míra zrušení</p>
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Konverzní trychtýř zakázek
        </h3>
        <div className="flex h-24 items-end gap-2 sm:gap-3">
          {[
            { label: 'Nové', count: pendingOrders, color: 'bg-amber-400' },
            { label: 'Probíhá', count: inProgressOrders, color: 'bg-blue-400' },
            { label: 'Dokončeno', count: completedOrders, color: 'bg-emerald-400' },
            { label: 'Zrušeno', count: cancelledOrders, color: 'bg-red-400' },
          ].map((step) => {
            const maxCount = Math.max(pendingOrders, inProgressOrders, completedOrders, cancelledOrders, 1);
            const height = Math.max((step.count / maxCount) * 100, 8);
            return (
              <div key={step.label} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-xs font-bold text-white">{step.count}</span>
                <div className="w-full rounded-t-xl bg-white/5 transition-all overflow-hidden" style={{ height: `${height}%` }}>
                  <div className={cn("h-full w-full rounded-t-xl", step.color)} />
                </div>
                <span className="text-[11px] font-medium text-gray-400">{step.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders Section */}
      <div className="rounded-2xl border border-white/10 bg-[#161616] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-white">Poslední zakázky</h3>
            <p className="text-xs text-gray-400">Rychlý přehled nejnovějších zadaných poptávek</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/api/admin/export/orders?status=COMPLETED"
              download
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-yellow transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Export hotových
            </a>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-xs font-semibold text-brand-yellow hover:underline"
            >
              Zobrazit všechny ({totalOrders}) →
            </Link>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="space-y-2.5 sm:hidden">
          {recentOrders.map((order: any) => (
            <Link
              key={order.id}
              href={`/admin/orders?search=${order.readableId}`}
              className="flex items-center justify-between rounded-xl border border-white/5 bg-[#1a1a1a] p-3 transition-colors hover:bg-white/5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-brand-yellow">
                    #{order.readableId}
                  </span>
                  <span className="truncate text-xs font-semibold text-white">
                    {order.serviceType}
                  </span>
                </div>
                <p className="truncate text-[11px] text-gray-400 mt-0.5">
                  {order.customer?.name || order.customer?.email || 'Neznámý'} · {order.technician?.name || 'Nepřiřazeno'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", statusColor(order.status))}>
                  {statusLabel(order.status)}
                </span>
                <ChevronRight className="h-4 w-4 text-gray-500" />
              </div>
            </Link>
          ))}
        </div>

        {/* Tablet & Desktop View: Table */}
        <div className="hidden sm:block overflow-hidden rounded-xl border border-white/5">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/5 bg-white/[0.02] text-xs font-semibold uppercase text-gray-400">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Typ služby</th>
                <th className="px-4 py-3">Zákazník</th>
                <th className="px-4 py-3">Technik</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3 text-right">Vytvořeno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentOrders.map((order: any) => (
                <tr
                  key={order.id}
                  className="hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders?search=${order.readableId}`}
                      className="font-mono text-xs font-bold text-brand-yellow hover:underline"
                    >
                      #{order.readableId}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs font-medium text-white">{order.serviceType}</td>
                  <td className="px-4 py-3 text-xs text-gray-300">
                    {order.customer?.name || order.customer?.email || '–'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {order.technician?.name ? (
                      <span className="text-gray-200">{order.technician.name}</span>
                    ) : (
                      <span className="text-red-400 font-medium">Nepřiřazeno</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-semibold", statusColor(order.status))}>
                      {statusLabel(order.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-gray-400">
                    {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
