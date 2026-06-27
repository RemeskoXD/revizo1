'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Save, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPriceCzk } from '@/lib/order-pricing';

type PricingItem = {
  id: string;
  code: string;
  category: string;
  name: string;
  priceCzk: number;
  unit: string;
};

type OrderPricingItem = {
  id?: string;
  pricingItemId: string;
  quantity: number;
  unitPriceCzk: number;
  totalPriceCzk: number;
  pricingItem?: PricingItem;
};

export function OrderPricingManager({ 
  orderId, 
  readableId, 
  initialItems = [], 
  readOnly = false,
  onUnsavedChanges
}: { 
  orderId: string, 
  readableId: string, 
  initialItems?: OrderPricingItem[], 
  readOnly?: boolean,
  onUnsavedChanges?: (hasUnsaved: boolean) => void
}) {
  const [inventory, setInventory] = useState<PricingItem[]>([]);
  const [items, setItems] = useState<OrderPricingItem[]>(initialItems);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  
  // For the "add new item" form
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Zjištění neuložených změn
  useEffect(() => {
    if (onUnsavedChanges) {
      const hasChanges = JSON.stringify(items.map(i => ({ id: i.pricingItemId, q: i.quantity }))) !== JSON.stringify(initialItems.map(i => ({ id: i.pricingItemId, q: i.quantity })));
      onUnsavedChanges(hasChanges);
    }
  }, [items, initialItems, onUnsavedChanges]);

  useEffect(() => {
    if (!readOnly) {
      fetch('/api/pricing-items')
        .then(res => res.json())
        .then(data => {
          if (data.items) setInventory(data.items);
        })
        .catch(console.error);
    }
  }, [readOnly]);

  const handleAddItem = () => {
    if (!selectedInventoryId) return;
    const invItem = inventory.find(i => i.id === selectedInventoryId);
    if (!invItem) return;

    setItems([...items, {
      pricingItemId: invItem.id,
      quantity: Number(quantity) || 1,
      unitPriceCzk: invItem.priceCzk,
      totalPriceCzk: invItem.priceCzk * (Number(quantity) || 1),
      pricingItem: invItem
    }]);

    setIsAdding(false);
    setSelectedInventoryId('');
    setQuantity(1);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${readableId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ pricingItemId: i.pricingItemId, quantity: i.quantity })) })
      });
      if (!res.ok) alert('Chyba při ukládání rozpočtu.');
      else {
        alert('Rozpočet úspěšně uložen.');
        window.location.reload();
      }
    } catch (err) {
      alert('Došlo k chybě.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = Array.from(new Set(inventory.map(i => i.category)));

  const total = items.reduce((sum, item) => sum + item.totalPriceCzk, 0);

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-yellow" />
          Rozpočet / Fakturace
        </h3>
        {!readOnly && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-brand-yellow text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-yellow-hover disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Ukládám...' : 'Uložit rozpočet'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <p className="text-gray-500 text-sm italic">Zatím nebyly přidány žádné položky z ceníku.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-gray-400 border-b border-white/10 text-left">
              <tr>
                <th className="pb-2 font-medium">Položka</th>
                <th className="pb-2 font-medium">Jednotka</th>
                <th className="pb-2 font-medium text-right">Počet</th>
                <th className="pb-2 font-medium text-right">Cena / j.</th>
                <th className="pb-2 font-medium text-right">Celkem (bez DPH)</th>
                {!readOnly && <th className="pb-2 font-medium"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item, idx) => (
                <tr key={idx} className="text-gray-300">
                  <td className="py-3">{item.pricingItem?.name || 'Neznámá položka'}</td>
                  <td className="py-3">{item.pricingItem?.unit}</td>
                  <td className="py-3 text-right">{item.quantity}</td>
                  <td className="py-3 text-right">{formatPriceCzk(item.unitPriceCzk)}</td>
                  <td className="py-3 text-right font-medium">{formatPriceCzk(item.totalPriceCzk)}</td>
                  {!readOnly && (
                    <td className="py-3 text-right">
                      <button onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-500 transition-colors p-1">
                        <Trash className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-white/10">
              <tr>
                <td colSpan={4} className="py-4 text-right text-gray-400 font-medium">Celkem bez DPH:</td>
                <td className="py-4 text-right text-lg font-bold text-white">{formatPriceCzk(total)}</td>
                {!readOnly && <td></td>}
              </tr>
            </tfoot>
          </table>
        )}

        {!readOnly && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-4 flex items-center gap-2 text-sm text-brand-yellow hover:text-brand-yellow-hover font-medium"
          >
            <Plus className="w-4 h-4" />
            Přidat položku z ceníku
          </button>
        )}

        {isAdding && (
          <div className="mt-4 p-4 border border-white/10 rounded-lg bg-white/5 grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8">
              <label className="block text-xs font-medium text-gray-500 mb-1">Položka z ceníku</label>
              <select 
                value={selectedInventoryId}
                onChange={e => setSelectedInventoryId(e.target.value)}
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none"
              >
                <option value="">Vyberte položku...</option>
                {categories.map(cat => (
                  <optgroup key={cat} label={cat}>
                    {inventory.filter(i => i.category === cat).map(i => (
                      <option key={i.id} value={i.id}>{i.name} ({formatPriceCzk(i.priceCzk)} / {i.unit})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Množství</label>
              {(() => {
                const selectedInv = inventory.find(i => i.id === selectedInventoryId);
                const isPausal = selectedInv?.unit === 'pausal';
                return (
                  <input 
                    type="number"
                    min="1"
                    step="0.5"
                    disabled={isPausal || !selectedInventoryId}
                    value={isPausal ? 1 : quantity}
                    onChange={e => setQuantity(e.target.valueAsNumber)}
                    className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-brand-yellow outline-none disabled:opacity-50"
                  />
                );
              })()}
            </div>

            <div className="md:col-span-2 flex items-end">
              <button 
                onClick={handleAddItem}
                disabled={!selectedInventoryId}
                className="w-full bg-brand-yellow text-black py-2 rounded-lg text-sm font-semibold hover:bg-brand-yellow-hover disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Přidat
              </button>
            </div>
            
            <div className="md:col-span-12">
               <button onClick={() => setIsAdding(false)} className="text-xs text-gray-500 hover:text-white">Zrušit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
