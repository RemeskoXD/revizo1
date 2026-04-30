'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FileText, Search, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

export default function OrdersClient({ orders }: { orders: any[] }) {
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = !searchQuery || 
        order.readableId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.serviceType?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Moje objednávky</h1>
          <p className="text-sm text-gray-400 sm:text-base">Přehled všech vašich revizí a jejich stavu.</p>
        </div>
        <div className="flex shrink-0 gap-3">
            <Link href="/dashboard/new-order" className="rounded-lg bg-brand-yellow px-4 py-2 text-center text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover">
                Nová objednávka
            </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-3 sm:flex-row sm:p-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat podle ID, adresy nebo typu..." 
                className="w-full bg-[#111] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50 transition-colors"
            />
        </div>
        <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-brand-yellow/50 outline-none"
        >
            <option value="all">Všechny stavy</option>
            <option value="PENDING">Čeká na vyřízení</option>
            <option value="IN_PROGRESS">Probíhá</option>
            <option value="COMPLETED">Dokončeno</option>
            <option value="NEEDS_REVISION">K přepracování</option>
            <option value="CANCELLED">Zrušeno</option>
        </select>
      </div>

      {/* Orders List */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#1A1A1A]">
        <div className="table-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
            <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-white/5 text-xs font-semibold uppercase text-gray-400">
                    <tr>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">ID</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Služba</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Adresa</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Datum</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Cena</th>
                        <th className="px-3 py-3 sm:px-5 sm:py-4">Stav</th>
                        <th className="px-3 py-3 text-right sm:px-5 sm:py-4">Akce</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-gray-500 sm:px-6">
                          {searchQuery || statusFilter !== 'all' ? 'Žádné objednávky neodpovídají filtru.' : 'Zatím nemáte žádné objednávky.'}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <motion.tr 
                          key={order.id} 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                          onClick={() => window.location.href = `/dashboard/orders/${order.readableId}`}
                        >
                            <td className="px-3 py-3 font-mono text-gray-500 sm:px-5 sm:py-4">
                                <Link href={`/dashboard/orders/${order.readableId}`} className="hover:text-brand-yellow transition-colors">
                                    #{order.readableId}
                                </Link>
                            </td>
                            <td className="px-3 py-3 font-medium text-white sm:px-5 sm:py-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded bg-white/5 text-gray-400 group-hover:text-brand-yellow transition-colors">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    {order.serviceType}
                                </div>
                            </td>
                            <td className="max-w-[12rem] px-3 py-3 text-gray-400 sm:px-5 sm:py-4"><span className="line-clamp-2">{order.address}</span></td>
                            <td className="whitespace-nowrap px-3 py-3 text-gray-400 sm:px-5 sm:py-4">{new Date(order.createdAt).toLocaleDateString('cs-CZ')}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-brand-yellow sm:px-5 sm:py-4">{order.price ? `${order.price.toLocaleString('cs-CZ')} Kč` : '-'}</td>
                            <td className="px-3 py-3 sm:px-5 sm:py-4">
                                <span className={cn(
                                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                                    order.status === 'COMPLETED' ? "bg-green-500/10 text-green-500" : 
                                    order.status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-500" :
                                    order.status === 'NEEDS_REVISION' ? "bg-orange-500/10 text-orange-500" :
                                    order.status === 'CANCELLED' ? "bg-red-500/10 text-red-500" :
                                    "bg-yellow-500/10 text-yellow-500"
                                )}>
                                    {order.status === 'COMPLETED' ? 'Dokončeno' : 
                                     order.status === 'IN_PROGRESS' ? 'Probíhá' :
                                     order.status === 'NEEDS_REVISION' ? 'K přepracování' :
                                     order.status === 'CANCELLED' ? 'Zrušeno' :
                                     'Čeká'}
                                </span>
                            </td>
                            <td className="px-3 py-3 text-right sm:px-5 sm:py-4">
                                <div className="flex items-center justify-end gap-2">
                                    <Link href={`/dashboard/orders/${order.readableId}`} className="p-2 text-gray-400 hover:text-brand-yellow transition-colors rounded-lg hover:bg-white/5">
                                        <FileText className="w-4 h-4" />
                                    </Link>
                                    {order.reportFile && (
                                      <a href={`/api/orders/${order.readableId}/download`} download onClick={(e) => e.stopPropagation()} className="p-2 text-gray-400 hover:text-brand-yellow transition-colors rounded-lg hover:bg-white/5">
                                          <Download className="w-4 h-4" />
                                      </a>
                                    )}
                                </div>
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
