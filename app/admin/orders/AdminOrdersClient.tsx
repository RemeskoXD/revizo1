'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  User, 
  Trash2, 
  Edit3, 
  XCircle, 
  X, 
  Loader2, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AdminOrderDetailDrawer, AdminOrderRecord } from '@/components/admin/AdminOrderDetailDrawer';

const STATUS_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  PENDING: { label: 'Nová', color: 'text-amber-400 bg-amber-500/10', border: 'border-amber-500/20' },
  IN_PROGRESS: { label: 'Probíhá', color: 'text-blue-400 bg-blue-500/10', border: 'border-blue-500/20' },
  NEEDS_REVISION: { label: 'K přepracování', color: 'text-orange-400 bg-orange-500/10', border: 'border-orange-500/20' },
  COMPLETED: { label: 'Dokončeno', color: 'text-emerald-400 bg-emerald-500/10', border: 'border-emerald-500/20' },
  CANCELLED: { label: 'Zrušeno', color: 'text-red-400 bg-red-500/10', border: 'border-red-500/20' },
};

export default function AdminOrdersClient({ 
  initialOrders, 
  technicians, 
  companies, 
  userRole,
  initialSearch = '',
  initialStatusFilter = 'all',
}: { 
  initialOrders: AdminOrderRecord[];
  technicians: { id: string; name?: string | null; email?: string | null }[];
  companies: { id: string; name?: string | null; email?: string | null }[];
  userRole: string;
  initialSearch?: string;
  initialStatusFilter?: string;
}) {
  const [orders, setOrders] = useState<AdminOrderRecord[]>(initialOrders);
  const [totalCount, setTotalCount] = useState(initialOrders.length);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const limit = 50;

  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const fetchOrders = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/admin/orders?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}`
        );
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders);
          setTotalCount(data.total);
        }
      } catch (err) {
        console.error('Fetch orders error:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    const timeout = setTimeout(() => {
      fetchOrders();
    }, 300);
    
    return () => clearTimeout(timeout);
  }, [page, search, statusFilter]);

  const handleOpenDetail = (order: AdminOrderRecord) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  const handleUpdateOrder = (updated: AdminOrderRecord) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
    if (selectedOrder?.id === updated.id) {
      setSelectedOrder(updated);
    }
    router.refresh();
  };

  const handleDeleteOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setTotalCount((c) => Math.max(0, c - 1));
    if (selectedOrder?.id === orderId) {
      setIsDrawerOpen(false);
      setSelectedOrder(null);
    }
    router.refresh();
  };

  const quickFilterTabs = [
    { id: 'all', label: 'Všechny' },
    { id: 'PENDING', label: 'Nové' },
    { id: 'IN_PROGRESS', label: 'Probíhá' },
    { id: 'COMPLETED', label: 'Dokončeno' },
    { id: 'CANCELLED', label: 'Zrušeno' },
  ];

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col gap-4">
        {/* iOS style Search Input */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            {isLoading ? (
              <Loader2 className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-yellow animate-spin" />
            ) : (
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            )}
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Hledat podle ID (#1001), adresy, zákazníka, technika, telefonu…"
              className="w-full rounded-2xl border border-white/10 bg-[#161616] py-3 pl-10 pr-10 text-sm text-white placeholder-gray-500 transition-all focus:border-white/30 focus:bg-[#1a1a1a] focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-white"
                title="Vymazat hledání"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Segmented iOS Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#161616] p-1">
            {quickFilterTabs.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setPage(1);
                  }}
                  className={`min-h-[38px] rounded-lg px-3.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="ml-auto text-xs text-gray-400">
            Nalezeno <strong className="text-white">{totalCount}</strong> zakázek
          </div>
        </div>
      </div>

      {/* Mobile Card List (Phones & Small Tablets) */}
      <div className="block space-y-3 lg:hidden">
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center text-sm text-gray-500">
            Žádné zakázky neodpovídají zadanému filtru.
          </div>
        ) : (
          orders.map((order) => {
            const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
            return (
              <div
                key={order.id}
                onClick={() => handleOpenDetail(order)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 transition-all active:scale-[0.99] hover:border-white/25 hover:bg-[#1a1a1a]"
              >
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-brand-yellow">
                      #{order.readableId}
                    </span>
                    <span className="text-sm font-semibold text-white truncate max-w-[180px]">
                      {order.serviceType}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusCfg.color}`}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                  <span className="truncate">{order.address}</span>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-xs">
                  <div className="text-gray-400">
                    {order.customer?.name || order.customer?.email || 'Neznámý'}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.price != null && (
                      <span className="font-bold text-brand-yellow">
                        {order.price.toLocaleString('cs-CZ')} Kč
                      </span>
                    )}
                    <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#141414] shadow-xl lg:block">
        <div className="table-scroll">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Typ služby & Adresa</th>
                <th className="px-5 py-4">Zákazník</th>
                <th className="px-5 py-4">Cena</th>
                <th className="px-5 py-4">Přiřazený technik</th>
                <th className="px-5 py-4">Stav</th>
                <th className="px-5 py-4 text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-500">
                    Žádné objednávky neodpovídají hledání.
                  </td>
                </tr>
              ) : (
                orders.map((order, index) => {
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr
                      key={order.id}
                      onClick={() => handleOpenDetail(order)}
                      className="group cursor-pointer transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-bold text-brand-yellow">
                        #{order.readableId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-white">{order.serviceType}</div>
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                          <MapPin className="h-3 w-3 shrink-0 text-gray-500" />
                          <span className="truncate max-w-[240px]">{order.address}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-200">
                          {order.customer?.name || order.customer?.email || 'Neznámý'}
                        </div>
                        {order.customer?.phone && (
                          <div className="text-xs text-gray-500">{order.customer.phone}</div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 font-bold text-brand-yellow">
                        {order.price != null ? `${order.price.toLocaleString('cs-CZ')} Kč` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {order.technician ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-yellow/20 text-[10px] font-bold text-brand-yellow">
                              {(order.technician.name || order.technician.email || 'T').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate text-xs font-medium text-white max-w-[150px]">
                              {order.technician.name || order.technician.email}
                            </span>
                          </div>
                        ) : order.company ? (
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-[10px] font-bold text-blue-400">
                              {(order.company.name || 'F').charAt(0).toUpperCase()}
                            </div>
                            <span className="truncate text-xs text-gray-300 max-w-[150px]">
                              {order.company.name}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-lg border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[11px] font-semibold text-red-400">
                            Nepřiřazeno
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusCfg.color}`}
                          >
                            {statusCfg.label}
                          </span>
                          {order.isVerifiedAdmin && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                              ✓ Schváleno
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(order)}
                            className="flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-semibold text-gray-300 transition-all hover:bg-white/10 hover:text-white"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Upravit
                          </button>
                          <a
                            href={`/dashboard/orders/${order.readableId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:bg-white/10 hover:text-white"
                            title="Veřejný náhled"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#121212] px-6 py-4">
          <div className="text-xs text-gray-400">
            Zobrazeno {orders.length} z {totalCount} objednávek
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
            >
              Předchozí
            </button>
            <span className="px-2 text-xs font-medium text-gray-400">
              Strana <strong className="text-white">{page}</strong>
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * limit >= totalCount || isLoading}
              className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-40"
            >
              Další
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Detail & Edit Drawer */}
      <AdminOrderDetailDrawer
        isOpen={isDrawerOpen}
        order={selectedOrder}
        technicians={technicians}
        companies={companies}
        userRole={userRole}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
        }}
        onUpdate={handleUpdateOrder}
        onDelete={handleDeleteOrder}
      />
    </div>
  );
}
