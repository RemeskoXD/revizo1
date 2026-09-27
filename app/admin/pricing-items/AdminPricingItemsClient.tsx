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
  Tag, 
  DollarSign, 
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

export interface PricingItemData {
  id: string;
  code: string;
  category: string;
  name: string;
  priceCzk: number;
  unit: string;
}

const PRESET_CATEGORIES = [
  'Elektroinstalace',
  'Hromosvody',
  'Plyn & plynová zařízení',
  'Tlakové nádoby & kotelny',
  'Kominictví & spalinové cesty',
  'Požární bezpečnost (PO)',
  'Doprava a výjezd',
  'Ostatní služby',
];

const UNIT_OPTIONS = [
  { value: 'ks', label: 'ks (kusy)' },
  { value: 'hodina', label: 'hodina' },
  { value: 'pausal', label: 'paušál' },
  { value: 'km', label: 'km (doprava)' },
  { value: 'm2', label: 'm² (plocha)' },
  { value: 'okruh', label: 'okruh' },
];

export default function AdminPricingItemsClient({ initialItems }: { initialItems: PricingItemData[] }) {
  const [items, setItems] = useState<PricingItemData[]>(initialItems || []);
  const [originalItems, setOriginalItems] = useState<PricingItemData[]>(initialItems || []);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saving, setSaving] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    code: '',
    category: PRESET_CATEGORIES[0],
    name: '',
    priceCzk: 1000,
    unit: 'ks',
  });

  // Calculate dirty / changed state
  const isDirty = useMemo(() => {
    if (items.length !== originalItems.length) return true;
    return JSON.stringify(items) !== JSON.stringify(originalItems);
  }, [items, originalItems]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.category?.trim()) set.add(i.category.trim()); });
    return Array.from(set).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const code = (item.code || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      const unit = (item.unit || '').toLowerCase();
      return code.includes(q) || cat.includes(q) || name.includes(q) || unit.includes(q);
    });
  }, [items, search, categoryFilter]);

  const handleCreate = () => {
    const newId = `new_${Date.now()}`;
    const generatedCode = `item_${Date.now().toString().slice(-4)}`;
    const newItem: PricingItemData = {
      id: newId,
      code: generatedCode,
      category: categoryFilter !== 'all' ? categoryFilter : (categories[0] || 'Elektroinstalace'),
      name: 'Nová revizní položka',
      priceCzk: 1200,
      unit: 'ks',
    };
    setItems(prev => [newItem, ...prev]);
    toast.success('Položka přidána na začátek seznamu. Nezapomeňte uložit ceník.');
  };

  const handleQuickAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickForm.name.trim()) {
      toast.error('Vyplňte název položky');
      return;
    }
    const finalCode = quickForm.code.trim() || `item_${Date.now().toString().slice(-4)}`;
    
    // Check code uniqueness
    if (items.some(i => i.code.toLowerCase() === finalCode.toLowerCase())) {
      toast.error('Kód položky musí být unikátní!');
      return;
    }

    const newItem: PricingItemData = {
      id: `new_${Date.now()}`,
      code: finalCode,
      category: quickForm.category,
      name: quickForm.name.trim(),
      priceCzk: Number(quickForm.priceCzk) || 0,
      unit: quickForm.unit,
    };

    setItems(prev => [newItem, ...prev]);
    setIsQuickAddOpen(false);
    setQuickForm({
      code: '',
      category: quickForm.category,
      name: '',
      priceCzk: 1000,
      unit: 'ks',
    });
    toast.success('Položka byla úspěšně přidána!');
  };

  const handleDuplicate = (item: PricingItemData) => {
    const newItem: PricingItemData = {
      ...item,
      id: `new_${Date.now()}`,
      code: `${item.code}_kopie_${Date.now().toString().slice(-3)}`,
      name: `${item.name} (kopie)`,
    };
    setItems(prev => [newItem, ...prev]);
    toast.success('Položka byla zduplikována pro rychlou editaci.');
  };

  const handleUpdate = (id: string, field: keyof PricingItemData, value: any) => {
    setItems(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string, name: string) => {
    setItems(prev => prev.filter(p => p.id !== id));
    toast.success(`Položka "${name || 'Položka'}" byla odebrána.`);
  };

  const handleSave = async () => {
    // Validate uniqueness of codes
    const codes = items.map(i => i.code.trim().toLowerCase());
    const duplicates = codes.filter((c, idx) => codes.indexOf(c) !== idx);
    if (duplicates.length > 0) {
      toast.error(`Kód "${duplicates[0]}" je použit vícekrát. Každý kód musí být unikátní!`);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setOriginalItems(data.items);
        toast.success('Ceník byl úspěšně uložen do databáze.');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Chyba při ukládání ceníku.');
      }
    } catch {
      toast.error('Chyba při odesílání požadavku na server.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Podrobný ceník (pro fakturaci a rozpočty)
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Standardizované položky, ze kterých technici sestavují rozpočty a položkové faktury po provedení revize.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
            type="button"
            className="min-h-[44px] flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 active:scale-95 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 text-brand-yellow" />
            <span>Nová položka</span>
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
            <span>Uložit ceník</span>
            {isDirty && (
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-black text-white">
                Změny
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Floating alert when changes are unsaved */}
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
              <span>Máte neuložené úpravy v ceníku. Pro použití v objednávkách klikněte na <strong>Uložit ceník</strong>.</span>
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

      {/* Quick Add Form Drawer / Modal */}
      <AnimatePresence>
        {isQuickAddOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleQuickAddSubmit}
            className="overflow-hidden rounded-2xl border border-brand-yellow/30 bg-[#161616] p-5 shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-yellow" />
                <h3 className="font-bold text-white text-base">Rychlé přidání nové položky ceníku</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Kategorie</label>
                <input
                  type="text"
                  list="categories-list"
                  placeholder="např. Elektroinstalace"
                  value={quickForm.category}
                  onChange={e => setQuickForm({ ...quickForm, category: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white focus:border-brand-yellow focus:outline-none"
                  required
                />
                <datalist id="categories-list">
                  {Array.from(new Set([...PRESET_CATEGORIES, ...categories])).map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1">Název položky / úkonu</label>
                <input
                  type="text"
                  placeholder="např. Periodická revize elektroinstalace bytu"
                  value={quickForm.name}
                  onChange={e => setQuickForm({ ...quickForm, name: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white focus:border-brand-yellow focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Unikátní kód (volitelný)</label>
                <input
                  type="text"
                  placeholder="např. EL_REV_01"
                  value={quickForm.code}
                  onChange={e => setQuickForm({ ...quickForm, code: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white font-mono uppercase focus:border-brand-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Cena bez DPH (Kč)</label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={quickForm.priceCzk}
                  onChange={e => setQuickForm({ ...quickForm, priceCzk: parseFloat(e.target.value) || 0 })}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white font-mono focus:border-brand-yellow focus:outline-none"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  S DPH 21%: {Math.round(quickForm.priceCzk * 1.21).toLocaleString('cs-CZ')} Kč
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Jednotka</label>
                <select
                  value={quickForm.unit}
                  onChange={e => setQuickForm({ ...quickForm, unit: e.target.value })}
                  className="w-full min-h-[44px] rounded-xl border border-white/10 bg-[#1F1F1F] px-3 text-sm text-white focus:border-brand-yellow focus:outline-none"
                >
                  {UNIT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-1 flex items-end">
                <button
                  type="submit"
                  className="w-full min-h-[44px] rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-bold text-black hover:bg-brand-yellow-hover active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Přidat položku</span>
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat podle kódu, názvu, kategorie, ceny nebo jednotky…"
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

        {/* Category Filter Tabs (iOS Pill Style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              "min-h-[40px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
              categoryFilter === 'all'
                ? "bg-brand-yellow text-black font-bold shadow-md shadow-brand-yellow/10"
                : "bg-[#181818] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <span>Všechny kategorie</span>
            <span className={cn(
              "rounded-full px-1.5 py-0.2 text-[10px]",
              categoryFilter === 'all' ? "bg-black/20 text-black font-black" : "bg-white/10 text-gray-400"
            )}>
              {items.length}
            </span>
          </button>
          {categories.map((c) => {
            const count = items.filter(i => i.category === c).length;
            const isActive = categoryFilter === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={cn(
                  "min-h-[40px] shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5",
                  isActive
                    ? "bg-white/15 text-white ring-1 ring-white/25 shadow-sm"
                    : "bg-[#181818] border border-white/10 text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span>{c}</span>
                <span className="text-[10px] text-gray-500 font-normal">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Card List (Phones & Small Tablets) */}
      <div className="space-y-3 lg:hidden">
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-white/5 bg-[#141414] p-8 text-center text-sm text-gray-500">
            {search || categoryFilter !== 'all' ? 'Žádné položky neodpovídají zadanému filtru.' : 'Ceník je prázdný.'}
          </div>
        ) : (
          filteredItems.map((item) => {
            const priceWithDph = Math.round((Number(item.priceCzk) || 0) * 1.21);
            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-4 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-white/5 px-2 py-0.5 text-[11px] font-mono text-gray-400 mb-1">
                      {item.code}
                    </span>
                    <input
                      type="text"
                      value={item.name}
                      onChange={e => handleUpdate(item.id, 'name', e.target.value)}
                      placeholder="Název položky"
                      className="w-full bg-transparent font-bold text-white text-base focus:border-b focus:border-brand-yellow outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(item)}
                      title="Duplikovat položku"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white active:scale-95"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.name)}
                      title="Smazat položku"
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Kategorie</label>
                    <input
                      type="text"
                      list="categories-list"
                      value={item.category}
                      onChange={e => handleUpdate(item.id, 'category', e.target.value)}
                      className="w-full rounded-lg bg-[#111] border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 focus:border-brand-yellow outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-semibold block mb-0.5">Jednotka</label>
                    <select
                      value={item.unit}
                      onChange={e => handleUpdate(item.id, 'unit', e.target.value)}
                      className="w-full rounded-lg bg-[#111] border border-white/10 px-2.5 py-1.5 text-xs text-gray-200 focus:border-brand-yellow outline-none"
                    >
                      {UNIT_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-black/40 p-3 border border-white/5">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Cena bez DPH (Kč)</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={item.priceCzk}
                      onChange={e => handleUpdate(item.id, 'priceCzk', parseFloat(e.target.value) || 0)}
                      className="bg-transparent font-mono font-black text-brand-yellow text-lg focus:border-b focus:border-brand-yellow outline-none w-28"
                    />
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block">Včetně 21% DPH</span>
                    <span className="font-mono text-sm text-gray-300 font-semibold">
                      {priceWithDph.toLocaleString('cs-CZ')} Kč
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-2xl border border-white/10 bg-[#161616] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#111] text-gray-400 border-b border-white/10 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-4 font-semibold w-28">Kód</th>
                <th className="px-5 py-4 font-semibold w-48">Kategorie</th>
                <th className="px-5 py-4 font-semibold">Název položky / úkonu</th>
                <th className="px-5 py-4 font-semibold text-right w-36">Cena bez DPH</th>
                <th className="px-5 py-4 font-semibold text-right w-32">S DPH 21%</th>
                <th className="px-5 py-4 font-semibold w-32">Jednotka</th>
                <th className="px-5 py-4 font-semibold text-right w-24">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                    Žádné položky neodpovídají zadanému filtru.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const priceWithDph = Math.round((Number(item.priceCzk) || 0) * 1.21);
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Code */}
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={item.code}
                          onChange={e => handleUpdate(item.id, 'code', e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow group-hover:border-white/10 outline-none w-24 text-xs font-mono text-gray-300 transition-colors"
                        />
                      </td>

                      {/* Category */}
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          list="categories-list"
                          value={item.category}
                          onChange={e => handleUpdate(item.id, 'category', e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow group-hover:border-white/10 outline-none w-44 text-xs text-gray-300 transition-colors"
                        />
                      </td>

                      {/* Name */}
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleUpdate(item.id, 'name', e.target.value)}
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow group-hover:border-white/10 outline-none w-full min-w-[280px] text-sm font-medium text-white transition-colors"
                        />
                      </td>

                      {/* Price without DPH */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            min="0"
                            step="10"
                            value={item.priceCzk}
                            onChange={e => handleUpdate(item.id, 'priceCzk', parseFloat(e.target.value) || 0)}
                            className="bg-[#111] border border-white/10 rounded-lg px-2.5 py-1 focus:border-brand-yellow outline-none w-24 text-right text-xs font-mono font-bold text-brand-yellow"
                          />
                          <span className="text-xs text-gray-500">Kč</span>
                        </div>
                      </td>

                      {/* Price with DPH */}
                      <td className="px-5 py-3 text-right font-mono text-xs text-gray-400">
                        {priceWithDph.toLocaleString('cs-CZ')} Kč
                      </td>

                      {/* Unit */}
                      <td className="px-5 py-3">
                        <select
                          value={item.unit}
                          onChange={e => handleUpdate(item.id, 'unit', e.target.value)}
                          className="bg-[#111] border border-white/10 rounded-lg px-2.5 py-1 focus:border-brand-yellow outline-none text-xs text-gray-300"
                        >
                          {UNIT_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicate(item)}
                            title="Duplikovat položku"
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id, item.name)}
                            title="Smazat položku"
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom helper & quick add button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4" />
          <span>Tip: Úpravy se provádí přímo v polích. Kliknutím na ikonu kopírování můžete položku rychle zduplikovat.</span>
        </div>
        <button
          onClick={handleCreate}
          type="button"
          className="flex items-center gap-1.5 text-brand-yellow hover:text-brand-yellow-hover font-semibold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Přidat další řádek ceníku</span>
        </button>
      </div>
    </div>
  );
}
