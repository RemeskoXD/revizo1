'use client';

import { useMemo, useState } from 'react';
import { 
  ShieldCheck, Clock, Edit3, Save, X, Database, 
  Zap, Flame, Wind, ArrowUpCircle, Gauge, Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';

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
  targetRoles: string | null;
  _count: { orders: number };
}

const TARGET_ROLE_CHOICES: { value: string; label: string }[] = [
  { value: 'CUSTOMER', label: 'Zákazník (RD)' },
  { value: 'SVJ', label: 'SVJ / Velké firmy' },
  { value: 'COMPANY_ADMIN', label: 'Pracujeme v týmu' },
  { value: 'REALTY', label: 'Realitní makléř' },
  { value: 'PRODUCT_MANAGER', label: 'Produkt Manager' },
];

function rolesToArray(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((r) => r.trim().toUpperCase())
    .filter((r) => r.length > 0);
}

function rolesLabel(csv: string | null | undefined): string {
  const arr = rolesToArray(csv);
  if (arr.length === 0) return 'Všechny';
  return arr
    .map((r) => TARGET_ROLE_CHOICES.find((c) => c.value === r)?.label || r)
    .join(', ');
}

export default function RevisionsClient({ categories, isAdmin }: { categories: RevisionCategory[]; isAdmin: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInterval, setEditInterval] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editTargetRoles, setEditTargetRoles] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);

  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    categories.forEach(c => { if (c.group) set.add(c.group); });
    return Array.from(set);
  }, [categories]);

  const filteredCategories = useMemo(() => {
    return categories.filter(cat => {
      if (selectedGroup !== 'all' && cat.group !== selectedGroup) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = (cat.name || '').toLowerCase();
      const group = (cat.group || '').toLowerCase();
      const desc = (cat.description || '').toLowerCase();
      const legal = (cat.legalBasis || '').toLowerCase();
      return name.includes(q) || group.includes(q) || desc.includes(q) || legal.includes(q);
    });
  }, [categories, search, selectedGroup]);

  const grouped = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => {
      if (!acc[cat.group]) acc[cat.group] = [];
      acc[cat.group].push(cat);
      return acc;
    }, {} as Record<string, RevisionCategory[]>);
  }, [filteredCategories]);

  const startEdit = (cat: RevisionCategory) => {
    setEditingId(cat.id);
    setEditInterval(cat.intervalMonths);
    setEditDescription(cat.description || '');
    setEditTargetRoles(rolesToArray(cat.targetRoles));
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
        body: JSON.stringify({
          intervalMonths: editInterval,
          description: editDescription,
          targetRoles: editTargetRoles,
        }),
      });
      if (res.ok) {
        setEditingId(null);
        toast.success('Kategorie revize byla aktualizována.');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || 'Chyba při ukládání');
      }
    } catch {
      toast.error('Chyba při ukládání');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!confirm('Chcete naplnit databázi výchozími revizními kategoriemi dle české legislativy?')) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/admin/revisions/seed', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message || 'Kategorie byly úspěšně naplněny.');
        router.refresh();
      } else {
        toast.error(data.message || 'Chyba při seedování');
      }
    } catch {
      toast.error('Chyba při seedování');
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat revizní kategorii, skupinu, popis nebo zákonný předpis…"
          className="w-full rounded-lg border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            title="Vymazat vyhledávání"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Group Filter Tabs (iOS style) */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedGroup('all')}
          className={cn(
            "min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
            selectedGroup === 'all'
              ? "bg-brand-yellow text-black font-bold shadow-md shadow-brand-yellow/10"
              : "bg-[#181818] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
          )}
        >
          Všechny skupiny ({categories.length})
        </button>
        {availableGroups.map((grp) => {
          const count = categories.filter((c) => c.group === grp).length;
          const isActive = selectedGroup === grp;
          return (
            <button
              key={grp}
              type="button"
              onClick={() => setSelectedGroup(grp)}
              className={cn(
                "min-h-[38px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                isActive
                  ? "bg-white/15 text-white ring-1 ring-white/25 shadow-sm"
                  : "bg-[#181818] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <span>{grp}</span>
              <span className="text-[10px] text-gray-400 font-normal">({count})</span>
            </button>
          );
        })}
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

                {/* Mobile Cards View (Phones & Small Tablets) */}
                <div className="space-y-3 lg:hidden">
                  {cats.map((cat) => (
                    <div
                      key={cat.id}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-base leading-snug">{cat.name}</p>
                          {editingId === cat.id ? (
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              placeholder="Popis revize…"
                              className="mt-2 w-full rounded-xl bg-[#111] border border-white/10 p-2.5 text-xs text-gray-200 focus:border-brand-yellow outline-none resize-none"
                            />
                          ) : (
                            cat.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-2">{cat.description}</p>
                            )
                          )}
                        </div>

                        {isAdmin && (
                          <div className="shrink-0">
                            {editingId === cat.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(cat.id)}
                                  disabled={isLoading}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startEdit(cat)}
                                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-brand-yellow hover:bg-white/10 active:scale-95 transition-all"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                        <div className="rounded-xl bg-black/40 p-2.5 border border-white/5">
                          <span className="text-[10px] text-gray-500 block mb-0.5">Zákonná lhůta</span>
                          {editingId === cat.id ? (
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                min={1}
                                value={editInterval}
                                onChange={(e) => setEditInterval(parseInt(e.target.value) || 1)}
                                className="w-16 rounded-lg bg-[#111] border border-white/10 px-2 py-1 text-white text-center font-bold font-mono focus:border-brand-yellow outline-none text-xs"
                              />
                              <span className="text-gray-400 text-xs">měs.</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 font-semibold text-white">
                              <Clock className={cn("w-3.5 h-3.5", textColor)} />
                              <span>{formatInterval(cat.intervalMonths)}</span>
                              <span className="text-[10px] text-gray-500 font-normal font-mono">({cat.intervalMonths} m)</span>
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl bg-black/40 p-2.5 border border-white/5">
                          <span className="text-[10px] text-gray-500 block mb-0.5">Objednávky v systému</span>
                          <span className="text-xs font-bold text-gray-300 font-mono">
                            {cat._count.orders} zakázek
                          </span>
                        </div>
                      </div>

                      {editingId === cat.id ? (
                        <div className="rounded-xl bg-black/40 p-3 border border-white/5 space-y-2">
                          <span className="text-[10px] text-gray-500 font-semibold block">Cílové role uživatelů:</span>
                          <div className="grid grid-cols-2 gap-2">
                            {TARGET_ROLE_CHOICES.map((opt) => (
                              <label key={opt.value} className="min-h-[36px] flex items-center gap-2 text-xs text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={editTargetRoles.includes(opt.value)}
                                  onChange={(e) => {
                                    setEditTargetRoles((prev) =>
                                      e.target.checked
                                        ? [...prev, opt.value]
                                        : prev.filter((r) => r !== opt.value),
                                    );
                                  }}
                                  className="h-4 w-4 accent-brand-yellow rounded"
                                />
                                <span className="truncate">{opt.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                          <span className="truncate max-w-[200px]">{rolesLabel(cat.targetRoles)}</span>
                          <span className="font-mono text-gray-400">{cat.legalBasis || '–'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-gray-400 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-6 py-3">Kategorie</th>
                        <th className="px-6 py-3">Lhůta</th>
                        <th className="px-6 py-3">Pro role</th>
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
                          <td className="px-6 py-4">
                            {editingId === cat.id ? (
                              <div className="flex flex-col gap-1.5">
                                {TARGET_ROLE_CHOICES.map((opt) => (
                                  <label key={opt.value} className="flex items-center gap-2 text-xs text-gray-300">
                                    <input
                                      type="checkbox"
                                      checked={editTargetRoles.includes(opt.value)}
                                      onChange={(e) => {
                                        setEditTargetRoles((prev) =>
                                          e.target.checked
                                            ? [...prev, opt.value]
                                            : prev.filter((r) => r !== opt.value),
                                        );
                                      }}
                                      className="h-3.5 w-3.5 accent-brand-yellow"
                                    />
                                    {opt.label}
                                  </label>
                                ))}
                                <p className="mt-1 text-[10px] text-gray-500">
                                  Bez zaškrtnutí = pro všechny role
                                </p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">{rolesLabel(cat.targetRoles)}</span>
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
