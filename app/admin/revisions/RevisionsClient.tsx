'use client';

import { useState } from 'react';
import { 
  ShieldCheck, Clock, Edit3, Save, X, Database, 
  Zap, Flame, Wind, ArrowUpCircle, Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

const GROUP_ICONS: Record<string, any> = {
  'Elektrická zařízení': Zap,
  'Plynová zařízení': Flame,
  'Tlaková zařízení': Gauge,
  'Zdvihací zařízení': ArrowUpCircle,
  'Požární ochrana': Wind,
};

const GROUP_COLORS: Record<string, string> = {
  'Elektrická zařízení': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
  'Plynová zařízení': 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  'Tlaková zařízení': 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  'Zdvihací zařízení': 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  'Požární ochrana': 'text-red-500 bg-red-500/10 border-red-500/20',
};

function formatInterval(months: number): string {
  if (months >= 12) {
    const years = months / 12;
    if (Number.isInteger(years)) {
      return `${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'}`;
    }
    return `${years.toFixed(1)} roku`;
  }
  return `${months} ${months === 1 ? 'měsíc' : months < 5 ? 'měsíce' : 'měsíců'}`;
}

interface RevisionCategory {
  id: string;
  name: string;
  group: string;
  intervalMonths: number;
  legalBasis: string | null;
  description: string | null;
  _count: { orders: number };
}

export default function RevisionsClient({ categories, isAdmin }: { categories: RevisionCategory[]; isAdmin: boolean }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const grouped = categories.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, RevisionCategory[]>);

  const startEdit = (cat: RevisionCategory) => {
    setEditingId(cat.id);
    setEditInterval(cat.intervalMonths);
    setEditDescription(cat.description || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/revisions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ intervalMonths: editInterval, description: editDescription }),
      });
      if (res.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Chyba při ukládání');
      }
    } catch {
      alert('Chyba při ukládání');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('Chcete naplnit databázi výchozími revizními kategoriemi dle české legislativy?')) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/admin/revisions/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        router.refresh();
      } else {
        alert(data.message || 'Chyba');
      }
    } catch {
      alert('Chyba při seedování');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Revize – Lhůty a data</h1>
          <p className="text-gray-400">Správa revizních kategorií a zákonných lhůt dle české legislativy.</p>
        </div>
        {isAdmin && categories.length === 0 && (
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-4 py-2 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Database className="w-4 h-4" />
            {isSeeding ? 'Načítání...' : 'Naplnit výchozí data'}
          </button>
        )}
        {isAdmin && categories.length > 0 && (
          <button
            onClick={handleSeed}
            disabled={isSeeding}
            className="px-4 py-2 bg-white/5 text-white border border-white/10 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 disabled:opacity-50 text-sm"
          >
            <Database className="w-4 h-4" />
            {isSeeding ? 'Načítání...' : 'Doplnit chybějící kategorie'}
          </button>
        )}
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-brand-yellow/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-brand-yellow" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Zákonný základ</h3>
            <p className="text-sm text-gray-400">Zákon 250/2021 Sb., NV 190–193/2022 Sb., NV 378/2001 Sb., Zákon 133/1985 Sb.</p>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Platí vždy nejkratší lhůta. Při změně prostředí nebo účelu je nutná mimořádná revize. Doporučujeme vést plán revizí.
        </p>
      </div>

      {categories.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
          <Database className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Žádné revizní kategorie</h3>
          <p className="text-gray-500 mb-6">Klikněte na &quot;Naplnit výchozí data&quot; pro naplnění databáze dle české legislativy.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([group, cats], groupIdx) => {
            const GroupIcon = GROUP_ICONS[group] || ShieldCheck;
            const colorClass = GROUP_COLORS[group] || 'text-gray-400 bg-gray-500/10 border-gray-500/20';
            const [textColor] = colorClass.split(' ');

            return (
              <motion.div 
                key={group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: groupIdx * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("p-2 rounded-lg border", colorClass)}>
                    <GroupIcon className="w-5 h-5" />
                  </div>
                  <h2 className={cn("text-lg font-bold", textColor)}>{group}</h2>
                  <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-full">{cats.length} kategorií</span>
                </div>

                <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-3">Kategorie</th>
                        <th className="px-6 py-3">Lhůta</th>
                        <th className="px-6 py-3">Právní předpis</th>
                        <th className="px-6 py-3">Objednávky</th>
                        {isAdmin && <th className="px-6 py-3 text-right">Akce</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {cats.map((cat) => (
                        <tr key={cat.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-medium text-white">{cat.name}</p>
                              {editingId === cat.id ? (
                                <textarea
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  rows={2}
                                  className="mt-1 w-full bg-[#111] border border-white/10 rounded p-2 text-xs text-gray-300 focus:border-brand-yellow outline-none resize-none"
                                />
                              ) : (
                                <p className="text-xs text-gray-500 mt-0.5">{cat.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {editingId === cat.id ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min={1}
                                  value={editInterval}
                                  onChange={(e) => setEditInterval(parseInt(e.target.value) || 1)}
                                  className="w-20 bg-[#111] border border-white/10 rounded p-1.5 text-white text-center focus:border-brand-yellow outline-none"
                                />
                                <span className="text-xs text-gray-500">měs.</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Clock className={cn("w-4 h-4", textColor)} />
                                <span className="text-white font-medium">{formatInterval(cat.intervalMonths)}</span>
                                <span className="text-xs text-gray-500">({cat.intervalMonths} měs.)</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-gray-400 text-xs font-mono">
                            {cat.legalBasis || '–'}
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-gray-400">{cat._count.orders}</span>
                          </td>
                          {isAdmin && (
                            <td className="px-6 py-4 text-right">
                              {editingId === cat.id ? (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => saveEdit(cat.id)}
                                    disabled={isLoading}
                                    className="p-1.5 text-green-500 hover:bg-green-500/10 rounded transition-colors disabled:opacity-50"
                                  >
                                    <Save className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="p-1.5 text-gray-400 hover:bg-white/10 rounded transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(cat)}
                                  className="p-1.5 text-gray-400 hover:text-brand-yellow hover:bg-white/5 rounded transition-colors"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
