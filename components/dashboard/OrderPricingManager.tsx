'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash, Save, FileText, Check, X } from 'lucide-react';
import { formatPriceCzk } from '@/lib/order-pricing';
import toast from 'react-hot-toast';

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
    toast.success('Položka přidána do rozpočtu');
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
    toast('Položka odstraněna', { icon: '🗑️' });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/orders/${readableId}/pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: items.map(i => ({ pricingItemId: i.pricingItemId, quantity: i.quantity })) })
      });
      if (!res.ok) {
        toast.error('Chyba při ukládání rozpočtu.');
      } else {
        toast.success('Rozpočet byl úspěšně uložen.');
        setTimeout(() => {
          window.location.reload();
        }, 800);
      }
    } catch {
      toast.error('Došlo k chybě při ukládání.');
    } finally {
      setIsSaving(false);
    }
  };

  const categories = Array.from(new Set(inventory.map(i => i.category)));
  const total = items.reduce((sum, item) => sum + item.totalPriceCzk, 0);

  return (
    <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-yellow" />
            Rozpočet / Fakturační položky
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">Jednotlivé úkony a ceníkové položky přiřazené k zakázce</p>
        </div>
        {!readOnly && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center gap-2 bg-brand-yellow text-black px-4 py-2.5 min-h-[44px] rounded-xl text-sm font-semibold hover:bg-brand-yellow-hover disabled:opacity-50 transition active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Ukládám...' : 'Uložit rozpočet'}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {items.length === 0 ? (
          <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-xl">
            <p className="text-gray-400 text-sm">Zatím nebyly přidány žádné položky z ceníku.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-400 border-b border-white/10 text-left">
                  <tr>
                    <th className="pb-3 font-medium">Položka</th>
                    <th className="pb-3 font-medium">Jednotka</th>
                    <th className="pb-3 font-medium text-right">Počet</th>
                    <th className="pb-3 font-medium text-right">Cena / j.</th>
                    <th className="pb-3 font-medium text-right">Celkem (bez DPH)</th>
                    {!readOnly && <th className="pb-3 font-medium w-10"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item, idx) => (
                    <tr key={idx} className="text-gray-300 hover:bg-white/[0.02]">
                      <td className="py-3 font-medium text-white">{item.pricingItem?.name || 'Neznámá položka'}</td>
                      <td className="py-3 text-neutral-400">{item.pricingItem?.unit}</td>
                      <td className="py-3 text-right">{item.quantity}</td>
                      <td className="py-3 text-right text-neutral-300">{formatPriceCzk(item.unitPriceCzk)}</td>
                      <td className="py-3 text-right font-semibold text-white">{formatPriceCzk(item.totalPriceCzk)}</td>
                      {!readOnly && (
                        <td className="py-3 text-right">
                          <button 
                            onClick={() => removeItem(idx)} 
                            title="Odebrat položku"
                            className="text-gray-400 hover:text-red-400 transition-colors p-2 rounded-lg hover:bg-white/5"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards (Apple iOS styled touch list) */}
            <div className="md:hidden space-y-2.5">
              {items.map((item, idx) => (
                <div key={idx} className="bg-neutral-900 border border-white/5 rounded-xl p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{item.pricingItem?.name || 'Neznámá položka'}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400 mt-1">
                      <span>{item.quantity} {item.pricingItem?.unit || 'ks'}</span>
                      <span>•</span>
                      <span>{formatPriceCzk(item.unitPriceCzk)} / j.</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-brand-yellow whitespace-nowrap">
                      {formatPriceCzk(item.totalPriceCzk)}
                    </span>
                    {!readOnly && (
                      <button 
                        onClick={() => removeItem(idx)} 
                        className="min-w-[40px] min-h-[40px] flex items-center justify-center text-neutral-400 hover:text-red-400 rounded-lg active:bg-white/10"
                        title="Odebrat"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total Bar */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-300">Celkem bez DPH:</span>
              <span className="text-xl font-bold text-brand-yellow">{formatPriceCzk(total)}</span>
            </div>
          </>
        )}

        {!readOnly && !isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="mt-2 inline-flex items-center justify-center gap-2 text-sm text-brand-yellow hover:text-brand-yellow-hover font-medium px-4 py-2.5 min-h-[44px] rounded-xl hover:bg-brand-yellow/10 transition active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Přidat položku z ceníku
          </button>
        )}

        {isAdding && (
          <div className="mt-4 p-4 sm:p-5 border border-white/10 rounded-2xl bg-white/[0.03] grid grid-cols-1 md:grid-cols-12 gap-3.5 animate-in fade-in duration-200">
            <div className="md:col-span-7">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Položka z ceníku</label>
              <select 
                value={selectedInventoryId}
                onChange={e => setSelectedInventoryId(e.target.value)}
                className="w-full bg-[#141414] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none min-h-[44px]"
              >
                <option value="">Vyberte položku...</option>
                {categories.map(cat => (
                  <optgroup key={cat} label={cat} className="bg-neutral-900 text-white font-semibold">
                    {inventory.filter(i => i.category === cat).map(i => (
                      <option key={i.id} value={i.id} className="font-normal">
                        {i.name} ({formatPriceCzk(i.priceCzk)} / {i.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Množství</label>
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
                    className="w-full bg-[#141414] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-yellow outline-none disabled:opacity-50 min-h-[44px]"
                  />
                );
              })()}
            </div>

            <div className="md:col-span-3 flex items-end gap-2">
              <button 
                onClick={handleAddItem}
                disabled={!selectedInventoryId}
                className="flex-1 bg-brand-yellow text-black min-h-[44px] py-2.5 px-3 rounded-xl text-sm font-semibold hover:bg-brand-yellow-hover disabled:opacity-50 flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
              >
                <Check className="w-4 h-4" />
                Přidat
              </button>
              <button 
                onClick={() => setIsAdding(false)} 
                className="min-h-[44px] px-3 border border-white/15 rounded-xl text-sm text-neutral-300 hover:text-white hover:bg-white/5 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
