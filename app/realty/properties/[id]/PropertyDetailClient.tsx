'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Plus, FileText, Calendar, MapPin, Clock, Home, ChevronRight } from 'lucide-react';
import Link from 'next/link';

type Order = {
  id: string;
  readableId: string;
  serviceType: string;
  propertyType: string;
  status: string;
  notes: string | null;
  preferredDate: string | null;
  createdAt: string;
};

type Property = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  transferToken: string | null;
  transferStatus: string | null;
  createdAt: string;
  orders: Order[];
};

export default function PropertyDetailClient({ property }: { property: Property }) {
  const [orders, setOrders] = useState<Order[]>(property.orders || []);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    serviceType: 'Revize oken',
    propertyType: 'Byt',
    notes: '',
    preferredDate: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [propertyData, setPropertyData] = useState<Property>(property);

  const handleGenerateLink = async () => {
    try {
      const res = await fetch(`/api/properties/${property.id}/generate-link`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setPropertyData({ ...propertyData, transferToken: updated.transferToken, transferStatus: updated.transferStatus });
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při generování odkazu');
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/claim-property?token=${token}`;
    navigator.clipboard.writeText(url);
    alert('Odkaz zkopírován do schránky!');
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/properties/${property.id}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          address: property.address || property.name
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setOrders([created, ...orders]);
        setIsAddModalOpen(false);
        setNewOrder({ serviceType: 'Revize oken', propertyType: 'Byt', notes: '', preferredDate: '' });
      } else {
        alert('Chyba při vytváření revize');
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při vytváření revize');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-6">
            <Link href="/realty/properties" className="shrink-0 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group mt-1">
              <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
            </Link>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center border border-brand-yellow/20">
                  <Home className="w-5 h-5 text-brand-yellow" />
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight">{propertyData.name}</h1>
                {propertyData.transferStatus === 'CLAIMED' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20 ml-2">
                    Čeká na potvrzení převodu
                  </span>
                )}
                {propertyData.transferStatus === 'PENDING' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20 ml-2">
                    Čeká na nárokování
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mt-3">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {propertyData.address || 'Adresa nenastavena'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  Přidáno {new Date(propertyData.createdAt).toLocaleDateString('cs-CZ')}
                </div>
              </div>
              {propertyData.description && (
                <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-3xl">
                  {propertyData.description}
                </p>
              )}
              
              {!propertyData.transferStatus && !propertyData.transferToken && (
                <div className="mt-6">
                  <button
                    onClick={handleGenerateLink}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors border border-white/10"
                  >
                    Vygenerovat odkaz pro převod
                  </button>
                </div>
              )}
              
              {propertyData.transferToken && propertyData.transferStatus === 'PENDING' && (
                <div className="mt-6 flex items-center gap-3">
                  <span className="text-sm text-gray-400">Odkaz pro nového majitele:</span>
                  <button
                    onClick={() => copyToClipboard(propertyData.transferToken!)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-sm font-medium rounded-xl transition-colors"
                  >
                    Zkopírovat odkaz
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-row sm:flex-col gap-4 bg-[#111] p-4 rounded-xl border border-white/5 min-w-[200px]">
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Celkem revizí</p>
              <p className="text-2xl font-bold text-white">{orders.length}</p>
            </div>
            <div className="w-px h-full sm:w-full sm:h-px bg-white/5"></div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Dokončeno</p>
              <p className="text-2xl font-bold text-green-500">{orders.filter(o => o.status === 'COMPLETED').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-yellow" />
            Revize a objednávky
            <span className="bg-white/10 text-gray-300 py-0.5 px-2.5 rounded-full text-xs font-medium ml-2">
              {orders.length}
            </span>
          </h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Nová revize
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-[#111] border border-white/10 hover:border-white/20 rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl hover:shadow-black/50"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0 group-hover:bg-brand-yellow/10 group-hover:border-brand-yellow/20 transition-colors">
                    <FileText className="w-6 h-6 text-gray-400 group-hover:text-brand-yellow transition-colors" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-brand-yellow transition-colors">{order.serviceType}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">#{order.readableId}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-6 flex-grow">
                <div className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Stav
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                    order.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                    order.status === 'NEEDS_REVISION' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                    order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                    'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
                  }`}>
                    {order.status === 'COMPLETED' ? 'Dokončeno' :
                     order.status === 'IN_PROGRESS' ? 'Probíhá' :
                     order.status === 'NEEDS_REVISION' ? 'K přepracování' :
                     order.status === 'CANCELLED' ? 'Zrušeno' : 'Čeká na vyřízení'}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-lg">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Home className="w-4 h-4" /> Typ nemovitosti
                  </span>
                  <span className="text-white font-medium">
                    {order.propertyType}
                  </span>
                </div>

                {order.preferredDate && (
                  <div className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-lg">
                    <span className="text-gray-400 flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Termín
                    </span>
                    <span className="text-white font-medium">
                      {new Date(order.preferredDate).toLocaleDateString('cs-CZ')}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-white/5 mt-auto">
                <Link 
                  href={`/realty/orders/${order.readableId}`}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-white text-sm font-medium rounded-xl transition-colors border border-white/10 group-hover:border-white/20"
                >
                  Detail revize
                  <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                </Link>
              </div>
            </motion.div>
          ))}

          {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 bg-[#111] border border-white/5 rounded-2xl text-center">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Žádné revize</h3>
              <p className="text-gray-400 text-sm max-w-md mb-8">Tato nemovitost zatím nemá žádné revize. Vytvořte první objednávku revize pro tuto nemovitost.</p>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Vytvořit první revizi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-yellow" />
                Nová revize
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateOrder} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Typ služby</label>
                <select
                  value={newOrder.serviceType}
                  onChange={e => setNewOrder({ ...newOrder, serviceType: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                >
                  <option value="Elektroinstalace - Byt">Elektroinstalace - Byt</option>
                  <option value="Elektroinstalace - Dům">Elektroinstalace - Dům</option>
                  <option value="Plynové zařízení">Plynové zařízení</option>
                  <option value="Hromosvod">Hromosvod</option>
                  <option value="Komíny">Komíny</option>
                  <option value="Hasicí přístroje">Hasicí přístroje</option>
                  <option value="Tlaková zařízení">Tlaková zařízení</option>
                  <option value="Komplexní revize">Komplexní revize</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Preferovaný termín (volitelné)</label>
                <input
                  type="date"
                  value={newOrder.preferredDate}
                  onChange={e => setNewOrder({ ...newOrder, preferredDate: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Poznámka (volitelné)</label>
                <textarea
                  placeholder="Doplňující informace k revizi..."
                  value={newOrder.notes}
                  onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all min-h-[120px] resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold rounded-xl transition-all shadow-lg shadow-brand-yellow/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? 'Vytvářím...' : 'Vytvořit revizi'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
