'use client';

import { useState } from 'react';
import { Search, Filter, MoreHorizontal, MapPin, Calendar, User, ArrowRight, Trash2, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export default function AdminOrdersClient({ initialOrders, technicians, companies, userRole }: { initialOrders: any[], technicians: any[], companies: any[], userRole: string }) {
  const [orders, setOrders] = useState(initialOrders);
  const [editingOrder, setEditingOrder] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');
  const [editTechnician, setEditTechnician] = useState<string>('');
  const [editCompany, setEditCompany] = useState<string>('');
  const router = useRouter();

  const handleSaveStatus = async (orderId: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: editStatus,
          technicianId: editTechnician || null,
          companyId: editCompany || null
        }),
      });

      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(orders.map(o => o.id === orderId ? { ...o, ...updatedOrder, technician: technicians.find(t => t.id === updatedOrder.technicianId), company: companies.find(c => c.id === updatedOrder.companyId) } : o));
        setEditingOrder(null);
        router.refresh();
      } else {
        alert('Došlo k chybě při ukládání stavu.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při ukládání stavu.');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Opravdu chcete smazat tuto objednávku? Tato akce je nevratná.')) return;
    
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setOrders(orders.filter(o => o.id !== orderId));
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Došlo k chybě při mazání objednávky.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při mazání objednávky.');
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/5 bg-[#111]">
      <div className="table-scroll -mx-3 px-3 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/5 text-gray-400 uppercase text-xs font-semibold">
                  <tr>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">ID</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Služba & Lokalita</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Zákazník</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Cena</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Přiřazený technik</th>
                      <th className="px-3 py-3 sm:px-5 sm:py-4">Stav</th>
                      <th className="px-3 py-3 text-right sm:px-5 sm:py-4">Akce</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-gray-500 sm:px-6">
                        Zatím žádné objednávky.
                      </td>
                    </tr>
                  ) : (
                    orders.map((order, index) => (
                      <motion.tr 
                        key={order.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                          <td className="px-3 py-3 font-mono text-gray-500 sm:px-5 sm:py-4">#{order.readableId}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                              <div className="font-medium text-white">{order.serviceType}</div>
                              <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                  <MapPin className="w-3 h-3" /> {order.address}
                              </div>
                          </td>
                          <td className="px-3 py-3 text-gray-300 sm:px-5 sm:py-4">{order.customer.name || order.customer.email}</td>
                          <td className="whitespace-nowrap px-3 py-3 text-brand-yellow sm:px-5 sm:py-4">{order.price ? `${order.price.toLocaleString('cs-CZ')} Kč` : '-'}</td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                              {editingOrder === order.id ? (
                                <div className="flex flex-col gap-2">
                                  <select 
                                    value={editTechnician} 
                                    onChange={(e) => setEditTechnician(e.target.value)}
                                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="">Bez technika</option>
                                    {technicians.map(t => (
                                      <option key={t.id} value={t.id}>{t.name || t.email}</option>
                                    ))}
                                  </select>
                                  <select 
                                    value={editCompany} 
                                    onChange={(e) => setEditCompany(e.target.value)}
                                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="">Bez firmy</option>
                                    {companies.map(c => (
                                      <option key={c.id} value={c.id}>{c.name || c.email}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : order.technician ? (
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-brand-yellow/20 flex items-center justify-center text-xs font-bold text-brand-yellow">
                                          {(order.technician.name || order.technician.email || '?').charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-white">{order.technician.name || order.technician.email}</span>
                                  </div>
                              ) : order.company ? (
                                  <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-500">
                                          {(order.company.name || order.company.email || '?').charAt(0).toUpperCase()}
                                      </div>
                                      <span className="text-white">{order.company.name || order.company.email} (Firma)</span>
                                  </div>
                              ) : (
                                  <span className="text-xs text-red-500 border border-red-500/30 px-2 py-1 rounded bg-red-500/10">
                                      Nepřiřazeno
                                  </span>
                              )}
                          </td>
                          <td className="px-3 py-3 sm:px-5 sm:py-4">
                              {editingOrder === order.id ? (
                                <div className="flex items-center gap-2">
                                  <select 
                                    value={editStatus} 
                                    onChange={(e) => setEditStatus(e.target.value)}
                                    className="bg-[#1A1A1A] border border-white/10 rounded px-2 py-1 text-white text-xs"
                                  >
                                    <option value="PENDING">Nová</option>
                                    <option value="IN_PROGRESS">Probíhá</option>
                                    <option value="NEEDS_REVISION">K přepracování</option>
                                    <option value="COMPLETED">Dokončeno</option>
                                    <option value="CANCELLED">Zrušeno</option>
                                  </select>
                                </div>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                                    order.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500' :
                                    order.status === 'NEEDS_REVISION' ? 'bg-orange-500/10 text-orange-500' :
                                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500' :
                                    'bg-yellow-500/10 text-yellow-500'
                                }`}>
                                    {order.status === 'COMPLETED' ? 'Dokončeno' :
                                     order.status === 'IN_PROGRESS' ? 'Probíhá' :
                                     order.status === 'NEEDS_REVISION' ? 'K přepracování' :
                                     order.status === 'CANCELLED' ? 'Zrušeno' : 'Nová'}
                                </span>
                              )}
                          </td>
                          <td className="px-3 py-3 text-right sm:px-5 sm:py-4">
                              {editingOrder === order.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => handleSaveStatus(order.id)} className="text-xs text-brand-yellow hover:underline">Uložit</button>
                                  <button onClick={() => setEditingOrder(null)} className="text-xs text-gray-500 hover:underline">Zrušit</button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button onClick={() => { setEditingOrder(order.id); setEditStatus(order.status); setEditTechnician(order.technicianId || ''); setEditCompany(order.companyId || ''); }} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-block">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <Link href={`/dashboard/orders/${order.readableId}`} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors inline-block">
                                      <MoreHorizontal className="w-4 h-4" />
                                  </Link>
                                  {userRole === 'ADMIN' && (
                                    <button onClick={() => handleDeleteOrder(order.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors inline-block">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              )}
                          </td>
                      </motion.tr>
                    ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
}
