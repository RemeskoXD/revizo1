'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Building, Plus, MapPin, Calendar, FileText, ShieldCheck, AlertTriangle, XCircle } from 'lucide-react';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const HEALTH_CONFIG = {
  green: { label: 'V pořádku', bg: 'bg-green-500', border: 'border-green-500/20', text: 'text-green-500', icon: ShieldCheck },
  orange: { label: 'Brzy vyprší', bg: 'bg-orange-500', border: 'border-orange-500/20', text: 'text-orange-500', icon: AlertTriangle },
  red: { label: 'Expirováno', bg: 'bg-red-500', border: 'border-red-500/20', text: 'text-red-500', icon: XCircle },
  unknown: { label: 'Bez revizí', bg: 'bg-gray-500', border: 'border-gray-500/20', text: 'text-gray-500', icon: FileText },
};

type BuildingItem = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  totalOrders: number;
  completedOrders: number;
  activeOrders: number;
  expiredCount: number;
  soonCount: number;
  health: string;
  createdAt: string;
};

export default function BuildingsClient({ initialBuildings }: { initialBuildings: BuildingItem[] }) {
  const [buildings, setBuildings] = useState<BuildingItem[]>(initialBuildings);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBuilding, setNewBuilding] = useState({ name: '', address: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBuilding),
      });
      if (res.ok) {
        const created = await res.json();
        setBuildings([{
          ...created,
          totalOrders: 0,
          completedOrders: 0,
          activeOrders: 0,
          expiredCount: 0,
          soonCount: 0,
          health: 'unknown',
        }, ...buildings]);
        setIsAddModalOpen(false);
        setNewBuilding({ name: '', address: '', description: '' });
      } else {
        alert('Chyba při vytváření budovy');
      }
    } catch {
      alert('Chyba při vytváření budovy');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1A1A1A] p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-brand-yellow" />
            Správa budov
          </h1>
          <p className="text-gray-400 text-sm mt-1">Spravujte bytové domy, revize společných prostor a dokumentaci.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Přidat budovu
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {buildings.map((building, index) => {
          const cfg = HEALTH_CONFIG[building.health as keyof typeof HEALTH_CONFIG];
          const HealthIcon = cfg.icon;

          return (
            <AnimatedItem key={building.id} delay={index * 0.08}>
              <Link href={`/svj/buildings/${building.id}`} className="block group">
                <div className={cn("bg-[#111] border rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl hover:shadow-black/50 hover:border-brand-yellow/30", cfg.border)}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 flex items-center justify-center border border-rose-500/20 shrink-0">
                        <Building className="w-6 h-6 text-rose-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white group-hover:text-brand-yellow transition-colors line-clamp-1">{building.name}</h3>
                        {building.address && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="line-clamp-1">{building.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={cn("shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold", `${cfg.bg}/10`, cfg.text)}>
                      <HealthIcon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                  </div>

                  {building.description && (
                    <p className="text-sm text-gray-500 mb-4 line-clamp-2">{building.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-3 mt-auto pt-4 border-t border-white/5">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{building.completedOrders}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Revizí</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-cyan-400">{building.activeOrders}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Aktivní</p>
                    </div>
                    <div className="text-center">
                      <p className={cn("text-lg font-bold", building.expiredCount > 0 ? "text-red-500" : "text-green-500")}>{building.expiredCount}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Expirováno</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-4 text-xs text-gray-600">
                    <Calendar className="w-3 h-3" />
                    Přidáno {new Date(building.createdAt).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
              </Link>
            </AnimatedItem>
          );
        })}

        {buildings.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 bg-[#111] border border-white/5 rounded-2xl text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Building className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Zatím nemáte žádné budovy</h3>
            <p className="text-gray-400 text-sm max-w-md mb-8">
              Přidejte svůj první bytový dům a začněte spravovat revize společných prostor – elektřinu, plyn, komíny, hromosvody a další.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Přidat první budovu
            </button>
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-brand-yellow" />
                Nová budova
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateBuilding} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Název budovy</label>
                <input
                  type="text"
                  required
                  placeholder="např. Bytový dům Květná 12, Panelák Zahradní"
                  value={newBuilding.name}
                  onChange={e => setNewBuilding({ ...newBuilding, name: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Adresa</label>
                <input
                  type="text"
                  placeholder="Ulice č.p., Město, PSČ"
                  value={newBuilding.address}
                  onChange={e => setNewBuilding({ ...newBuilding, address: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Popis (volitelné)</label>
                <textarea
                  placeholder="Počet bytů, podlaží, společné prostory..."
                  value={newBuilding.description}
                  onChange={e => setNewBuilding({ ...newBuilding, description: e.target.value })}
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
                  {isSubmitting ? 'Ukládám...' : 'Přidat budovu'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
