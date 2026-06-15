'use client';

import { useState } from 'react';
import { Save, Plus, Trash, Loader2 } from 'lucide-react';
import { formatPriceCzk } from '@/lib/order-pricing';

export default function AdminPricingItemsClient({ initialItems }: { initialItems: any[] }) {
  const [items, setItems] = useState<any[]>(initialItems || []);
  const [saving, setSaving] = useState(false);

  const handleCreate = () => {
    setItems([
      ...items,
      {
        id: `new_${Date.now()}`,
        code: `kod_${Date.now()}`,
        category: 'Nová kategorie',
        name: 'Nová položka',
        priceCzk: 0,
        unit: 'ks',
      }
    ]);
  };

  const handleUpdate = (id: string, field: string, value: any) => {
    setItems(items.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleDelete = (id: string) => {
    setItems(items.filter(p => p.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        alert('Položky byly úspěšně uloženy.');
        const data = await res.json();
        setItems(data.items);
      } else {
        alert('Chyba při ukládání (Kód musí být unikátní!).');
      }
    } catch (e) {
      alert('Chyba');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div>
           <h1 className="text-2xl font-bold text-white">Podrobný ceník (pro fakturaci)</h1>
           <p className="text-sm text-gray-400">Položky ceníku ze kterého revizní technik tvoří podrobný rozpočet po realizaci revize.</p>
         </div>
         <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
         >
           {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
           Uložit ceník
         </button>
      </div>

      <div className="bg-[#1A1A1A] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-[#111] text-gray-400 border-b border-white/10 text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Kód v aplikaci</th>
                <th className="px-4 py-3 font-medium">Kategorie</th>
                <th className="px-4 py-3 font-medium">Název položky</th>
                <th className="px-4 py-3 font-medium text-right">Cena bez DPH (Kč)</th>
                <th className="px-4 py-3 font-medium">Jednotka</th>
                <th className="px-4 py-3 font-medium text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-gray-300">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-transparent border-b border-white/10 focus:border-brand-yellow outline-none w-28 text-xs font-mono"
                      value={item.code}
                      onChange={e => handleUpdate(item.id, 'code', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-transparent border-b border-white/10 focus:border-brand-yellow outline-none w-48 text-xs"
                      value={item.category}
                      onChange={e => handleUpdate(item.id, 'category', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      className="bg-transparent border-b border-white/10 focus:border-brand-yellow outline-none w-full min-w-[250px] text-xs"
                      value={item.name}
                      onChange={e => handleUpdate(item.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <input
                      type="number"
                      className="bg-[#111] border border-white/10 rounded px-2 py-1 focus:border-brand-yellow outline-none w-24 text-right text-xs"
                      value={item.priceCzk}
                      onChange={e => handleUpdate(item.id, 'priceCzk', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      className="bg-[#111] border border-white/10 rounded px-2 py-1 focus:border-brand-yellow outline-none w-24 text-xs"
                      value={item.unit}
                      onChange={e => handleUpdate(item.id, 'unit', e.target.value)}
                    >
                      <option value="pausal">paušál</option>
                      <option value="ks">ks</option>
                      <option value="km">km</option>
                      <option value="hodina">hodina</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(item.id)} className="text-gray-500 hover:text-red-500 p-1">
                      <Trash className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={handleCreate}
        className="flex items-center gap-2 text-brand-yellow hover:text-brand-yellow-hover font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Přidat další položku
      </button>
    </div>
  );
}
