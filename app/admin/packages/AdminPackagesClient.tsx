'use client';

import { useMemo, useState } from 'react';
import { 
  Save, 
  Plus, 
  Trash2, 
  Loader2, 
  Search, 
  X, 
  Copy, 
  Check, 
  Layers, 
  Home, 
  Building2, 
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface ServicePackageData {
  id: string;
  name: string;
  description: string | null;
  approximatePrice: number | null;
  isVisibleRodinnyDum: boolean;
  isVisibleSVJ: boolean;
  isActive: boolean;
  orderIndex: number;
}

export default function AdminPackagesClient({ initialPackages }: { initialPackages: ServicePackageData[] }) {
  const [packages, setPackages] = useState<ServicePackageData[]>(initialPackages || []);
  const [originalPackages, setOriginalPackages] = useState<ServicePackageData[]>(initialPackages || []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterAudience, setFilterAudience] = useState<'all' | 'customer' | 'svj' | 'inactive'>('all');

  const isDirty = useMemo(() => {
    if (packages.length !== originalPackages.length) return true;
    return JSON.stringify(packages) !== JSON.stringify(originalPackages);
  }, [packages, originalPackages]);

  const filteredPackages = useMemo(() => {
    return packages.filter(pkg => {
      if (filterAudience === 'customer' && !pkg.isVisibleRodinnyDum) return false;
      if (filterAudience === 'svj' && !pkg.isVisibleSVJ) return false;
      if (filterAudience === 'inactive' && pkg.isActive) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = (pkg.name || '').toLowerCase();
      const desc = (pkg.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [packages, search, filterAudience]);

  const handleCreate = () => {
    const newPkg: ServicePackageData = {
      id: `new_${Date.now()}`,
      name: 'Nový balíček revizí',
      description: 'Základní popis služeb v balíčku…',
      approximatePrice: 3500,
      isVisibleRodinnyDum: true,
      isVisibleSVJ: true,
      isActive: true,
      orderIndex: packages.length,
    };
    setPackages(prev => [newPkg, ...prev]);
    toast.success('Nový balíček přidán na začátek.');
  };

  const handleDuplicate = (pkg: ServicePackageData) => {
    const duplicate: ServicePackageData = {
      ...pkg,
      id: `new_${Date.now()}`,
      name: `${pkg.name} (kopie)`,
      orderIndex: packages.length,
    };
    setPackages(prev => [duplicate, ...prev]);
    toast.success('Balíček byl zduplikován.');
  };

  const handleUpdate = (id: string, field: keyof ServicePackageData, value: any) => {
    setPackages(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string, name: string) => {
    setPackages(prev => prev.filter(p => p.id !== id));
    toast.success(`Balíček "${name || 'Balíček'}" byl odebrán.`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packages }),
      });
      if (res.ok) {
        const data = await res.json();
        setPackages(data.packages);
        setOriginalPackages(data.packages);
        toast.success('Balíčky byly úspěšně uloženy.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Chyba při ukládání balíčků.');
      }
    } catch {
      toast.error('Chyba při komunikaci se serverem.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Nabídka balíčků (Úvodní strana a průvodce)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Konfigurace přednastavených balíčků revizí, které se nabízí zákazníkům a správcům budov při poptávce.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleCreate}
            type="button"
            className="min-h-[44px] flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-brand-yellow" />
            <span>Přidat balíček</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className={cn(
              "min-h-[44px] flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-black transition-all shadow-sm active:scale-95",
              isDirty
                ? "bg-brand-yellow hover:bg-brand-yellow-hover shadow-brand-yellow/20 ring-2 ring-brand-yellow/40 animate-pulse"
                : "bg-white/15 text-gray-400 cursor-not-allowed"
            )}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Save className="w-4 h-4" />}
            <span>Uložit balíčky</span>
            {isDirty && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black text-white">
                Změny
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dirty state notification */}
      <AnimatePresence>
        {isDirty && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200"
          >
            <div className="flex items-center gap-2.5 text-sm">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>Máte neuložené změny v balíčcích. Klikněte na <strong>Uložit balíčky</strong>.</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-bold hover:bg-amber-300 transition-colors shrink-0"
            >
              {saving ? 'Ukládám…' : 'Uložit teď'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters and search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat balíček podle názvu nebo popisu…"
            className="w-full min-h-[44px] rounded-2xl border border-white/10 bg-[#161616] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              title="Vymazat vyhledávání"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter audience buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-white/10 bg-[#161616] p-1 text-xs">
          {[
            { id: 'all', label: `Všechny (${packages.length})` },
            { id: 'customer', label: 'Pro rodinné domy' },
            { id: 'svj', label: 'Pro SVJ / Firmy' },
            { id: 'inactive', label: 'Neaktivní' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterAudience(tab.id as any)}
              className={cn(
                "min-h-[36px] rounded-xl px-3 py-1.5 font-semibold transition-all whitespace-nowrap",
                filterAudience === tab.id
                  ? 'bg-brand-yellow text-black font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Packages Cards list */}
      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-10 text-center text-gray-500">
            {search ? 'Žádné balíčky neodpovídají zadanému hledání.' : 'Zatím nebyly vytvořeny žádné balíčky.'}
          </div>
        ) : (
          filteredPackages.map((pkg, idx) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className={cn(
                "overflow-hidden rounded-2xl border bg-[#161616] p-5 shadow-sm transition-all space-y-4",
                pkg.isActive ? "border-white/10" : "border-white/5 opacity-75 bg-[#121212]"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 font-mono text-xs font-bold text-gray-400">
                    #{idx + 1}
                  </div>
                  <span className={cn(
                    "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
                    pkg.isActive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-gray-500/10 text-gray-400 border-white/10"
                  )}>
                    {pkg.isActive ? 'Aktivní v nabídce' : 'Skrytý (neaktivní)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDuplicate(pkg)}
                    title="Zduplikovat balíček"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white active:scale-95 transition-all"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(pkg.id, pkg.name)}
                    title="Smazat balíček"
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Název balíčku (Zobrazí se na tlačítku / kartě)
                  </label>
                  <input
                    type="text"
                    className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3.5 text-sm font-bold text-white focus:border-brand-yellow outline-none"
                    value={pkg.name}
                    onChange={e => handleUpdate(pkg.id, 'name', e.target.value)}
                    placeholder="např. Kompletní revize rodinného domu"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Cena "Od" (Kč orientačně)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="100"
                      className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3.5 pr-10 text-sm font-mono font-bold text-brand-yellow focus:border-brand-yellow outline-none"
                      value={pkg.approximatePrice || 0}
                      onChange={e => handleUpdate(pkg.id, 'approximatePrice', parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500">
                      Kč
                    </span>
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Popis obsahu balíčku (Vysvětlení pro zákazníka)
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-xl border border-white/10 bg-[#1F1F1F] p-3 text-xs text-gray-200 focus:border-brand-yellow outline-none resize-none"
                    value={pkg.description || ''}
                    onChange={e => handleUpdate(pkg.id, 'description', e.target.value)}
                    placeholder="Popište co balíček zahrnuje (např. elektroinstalace, hromosvod, revizní zpráva do 48h)..."
                  />
                </div>
              </div>

              {/* Toggles (Apple Style Switch Row) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
                <div className="flex flex-wrap items-center gap-3">
                  {/* Customer checkbox */}
                  <label className="min-h-[44px] flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-200 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={pkg.isVisibleRodinnyDum}
                      onChange={e => handleUpdate(pkg.id, 'isVisibleRodinnyDum', e.target.checked)}
                      className="h-4 w-4 rounded accent-brand-yellow"
                    />
                    <Home className="w-3.5 h-3.5 text-blue-400" />
                    <span>Zákazníci (RD, byty)</span>
                  </label>

                  {/* SVJ checkbox */}
                  <label className="min-h-[44px] flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2 text-xs text-gray-200 cursor-pointer hover:bg-white/10 transition-colors">
                    <input
                      type="checkbox"
                      checked={pkg.isVisibleSVJ}
                      onChange={e => handleUpdate(pkg.id, 'isVisibleSVJ', e.target.checked)}
                      className="h-4 w-4 rounded accent-brand-yellow"
                    />
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>SVJ / Firemní účty</span>
                  </label>
                </div>

                {/* Active Toggle */}
                <label className="min-h-[44px] flex items-center gap-2.5 rounded-xl bg-white/5 px-3.5 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-white/10 transition-colors ml-auto">
                  <input
                    type="checkbox"
                    checked={pkg.isActive}
                    onChange={e => handleUpdate(pkg.id, 'isActive', e.target.checked)}
                    className="h-4 w-4 rounded accent-brand-yellow"
                  />
                  <span>{pkg.isActive ? 'Aktivní v objednávkách' : 'Pozastaveno'}</span>
                </label>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <div className="pt-2">
        <button
          onClick={handleCreate}
          type="button"
          className="flex items-center gap-2 text-brand-yellow hover:text-brand-yellow-hover font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat další balíček</span>
        </button>
      </div>
    </div>
  );
}
