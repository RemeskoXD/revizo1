'use client';

import { useMemo, useState } from 'react';
import { Save, Plus, Trash, Loader2, Search, X } from 'lucide-react';

export default function AdminPackagesClient({ initialPackages }: { initialPackages: any[] }) {
  const [packages, setPackages] = useState<any[]>(initialPackages || []);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredPackages = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.trim().toLowerCase();
    return packages.filter(pkg => {
      const name = (pkg.name || '').toLowerCase();
      const desc = (pkg.description || '').toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [packages, search]);

  const handleCreate = () => {
    setPackages([
      ...packages,
      {
        id: `new_${Date.now()}`,
        name: 'Nový balíček',
        description: '',
        approximatePrice: 0,
        isVisibleRodinnyDum: true,
        isVisibleSVJ: true,
        isActive: true,
        orderIndex: packages.length,
      }
    ]);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    setPackages(packages.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string) => {
    setPackages(packages.filter(p => p.id !== id));
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
        alert('Balíčky byly úspěšně uloženy.');
        const data = await res.json();
        setPackages(data.packages);
      } else {
        alert('Chyba při ukládání.');
      }
    } catch (e) {
      alert('Chyba');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <h1 className="text-2xl font-bold text-white">Nabídka balíčků (Tlačítka na hlavní stránce)</h1>
         <div className="flex items-center gap-2">
           <button
             onClick={handleCreate}
             type="button"
             className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 font-medium text-white hover:bg-white/15 transition-colors"
           >
             <Plus className="w-4 h-4" />
             Přidat balíček
           </button>
           <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
           >
             {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
             Uložit balíčky
           </button>
         </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hledat balíček podle názvu nebo popisu…"
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

      <div className="space-y-4">
        {filteredPackages.length === 0 ? (
          <div className="bg-[#1A1A1A] border border-white/10 p-8 rounded-xl text-center text-gray-500">
            {search ? 'Žádné balíčky neodpovídají zadanému hledání.' : 'Zatím žádné balíčky.'}
          </div>
        ) : (
          filteredPackages.map((pkg, idx) => (
          <div key={pkg.id} className="bg-[#1A1A1A] border border-white/10 p-4 rounded-xl space-y-4 relative">
             <button onClick={() => handleDelete(pkg.id)} className="absolute top-4 right-4 text-gray-500 hover:text-red-500">
               <Trash className="w-5 h-5" />
             </button>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Název balíčku (Tlačítka)</label>
                   <input
                     type="text"
                     className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-brand-yellow"
                     value={pkg.name}
                     onChange={e => handleUpdate(pkg.id, 'name', e.target.value)}
                   />
                </div>
                <div>
                   <label className="block text-xs font-medium text-gray-500 mb-1">Cena "Od" (Kč, pro orientaci)</label>
                   <input
                     type="number"
                     className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-brand-yellow"
                     value={pkg.approximatePrice || 0}
                     onChange={e => handleUpdate(pkg.id, 'approximatePrice', parseFloat(e.target.value) || 0)}
                   />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-xs font-medium text-gray-500 mb-1">Popis (Zobrazí se pod nadpisem)</label>
                   <input
                     type="text"
                     className="w-full bg-[#111] border border-white/10 rounded-lg p-2 text-white outline-none focus:border-brand-yellow"
                     value={pkg.description || ''}
                     onChange={e => handleUpdate(pkg.id, 'description', e.target.value)}
                   />
                </div>
             </div>

             <div className="flex gap-6 mt-4 pt-4 border-t border-white/10">
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={pkg.isVisibleRodinnyDum}
                    onChange={e => handleUpdate(pkg.id, 'isVisibleRodinnyDum', e.target.checked)}
                    className="rounded border-white/10 bg-[#111] text-brand-yellow focus:ring-brand-yellow focus:ring-offset-[#111]"
                  />
                  Zobrazit zákazníkům (Rodinné domy, byty)
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={pkg.isVisibleSVJ}
                    onChange={e => handleUpdate(pkg.id, 'isVisibleSVJ', e.target.checked)}
                    className="rounded border-white/10 bg-[#111] text-brand-yellow focus:ring-brand-yellow focus:ring-offset-[#111]"
                  />
                  Zobrazit pro SVJ / Firemní účty
                </label>
                 <label className="flex items-center gap-2 text-sm text-gray-300 ml-auto">
                  <input
                    type="checkbox"
                    checked={pkg.isActive}
                    onChange={e => handleUpdate(pkg.id, 'isActive', e.target.checked)}
                    className="rounded border-white/10 bg-[#111] text-brand-yellow focus:ring-brand-yellow focus:ring-offset-[#111]"
                  />
                  Aktivní
                </label>
             </div>
          </div>
        )))}
      </div>

      <button
        onClick={handleCreate}
        className="flex items-center gap-2 text-brand-yellow hover:text-brand-yellow-hover font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Přidat další balíček
      </button>
    </div>
  );
}
