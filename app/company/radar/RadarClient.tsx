'use client';

import { useState } from 'react';
import { Radio, MapPin, DollarSign, Calendar, Briefcase, Search, Navigation, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

export default function RadarClient({ orders, technicians }: { orders: any[], technicians: any[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [assignTechId, setAssignTechId] = useState<Record<string, string>>({});

  const filtered = orders.filter(o => {
    if (!search) return true;
    const q = search.toLowerCase();
    return o.serviceType?.toLowerCase().includes(q) || o.address?.toLowerCase().includes(q);
  });

  const handleClaim = async (readableId: string) => {
    setClaimingId(readableId);
    try {
      const res = await fetch(`/api/orders/${readableId}/claim`, { method: 'POST' });
      if (res.ok) {
        const techId = assignTechId[readableId];
        if (techId) {
          await fetch(`/api/company/orders/${readableId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ technicianId: techId }),
          });
        }
        router.refresh();
      } else {
        alert('Chyba při přijímání zakázky.');
      }
    } catch { alert('Chyba.'); }
    finally { setClaimingId(null); }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-orange-500 animate-pulse" /> Radar poptávek
          </h1>
          <p className="text-gray-400 text-sm">Veřejné zakázky čekající na přijetí. Kdo první, ten bere.</p>
        </div>
        <span className="text-sm text-orange-400 font-medium">{orders.length} dostupných</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filtrovat podle typu nebo adresy..." className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-brand-yellow/50 outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
          <Radio className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">{search ? 'Žádné poptávky neodpovídají filtru.' : 'Momentálně nejsou žádné volné poptávky.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((order, idx) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: idx * 0.05 }}
              className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-5 hover:border-orange-500/40 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-500">#{order.readableId}</span>
                    <h3 className="text-lg font-semibold text-white">{order.serviceType}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <span><MapPin className="w-3.5 h-3.5 inline mr-1" />{order.address}</span>
                    {order.customer?.name && <span>{order.customer.name}</span>}
                    <span><Clock className="w-3.5 h-3.5 inline mr-1" />{new Date(order.createdAt).toLocaleDateString('cs-CZ')}</span>
                  </div>
                  {order.price && (
                    <p className="text-lg font-bold text-brand-yellow"><DollarSign className="w-4 h-4 inline" /> {order.price.toLocaleString('cs-CZ')} Kč</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[220px]">
                  {technicians.length > 0 && (
                    <select value={assignTechId[order.readableId] || ''} onChange={(e) => setAssignTechId({ ...assignTechId, [order.readableId]: e.target.value })}
                      className="bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-yellow outline-none"
                    >
                      <option value="">Přiřadit technikovi...</option>
                      {technicians.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name || t.email}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={() => handleClaim(order.readableId)} disabled={claimingId === order.readableId}
                    className="w-full px-4 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" /> {claimingId === order.readableId ? 'Přijímám...' : 'Převzít zakázku'}
                  </button>
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noopener noreferrer"
                    className="w-full px-4 py-2 bg-white/5 text-gray-400 text-sm font-medium rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" /> Zobrazit na mapě
                  </a>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
