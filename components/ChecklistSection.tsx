'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ChecklistSection({ orderId, isTechnician }: { orderId: string, isTechnician: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchChecklist();
  }, [orderId]);

  const fetchChecklist = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/checklist`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim() || !isTechnician) return;

    try {
      const res = await fetch(`/api/orders/${orderId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newItemText }),
      });
      if (res.ok) {
        const item = await res.json();
        setItems([...items, item]);
        setNewItemText('');
      }
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const toggleItem = async (itemId: string, currentStatus: boolean) => {
    if (!isTechnician) return;
    
    // Optimistic update
    setItems(items.map(item => item.id === itemId ? { ...item, isCompleted: !currentStatus } : item));

    try {
      const res = await fetch(`/api/orders/${orderId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !currentStatus }),
      });
      if (!res.ok) {
        // Revert
        setItems(items.map(item => item.id === itemId ? { ...item, isCompleted: currentStatus } : item));
      }
    } catch (error) {
      setItems(items.map(item => item.id === itemId ? { ...item, isCompleted: currentStatus } : item));
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!isTechnician) return;
    
    const prevItems = [...items];
    setItems(items.filter(item => item.id !== itemId));

    try {
      const res = await fetch(`/api/orders/${orderId}/checklist/${itemId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        setItems(prevItems);
      }
    } catch (error) {
      setItems(prevItems);
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-500">Načítání checklistu...</div>;
  }

  return (
    <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Checklist</h3>
      
      <div className="space-y-3 mb-4">
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Žádné položky v checklistu.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="flex items-center justify-between group">
              <div 
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => toggleItem(item.id, item.isCompleted)}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border transition-colors",
                  item.isCompleted ? "bg-green-500 border-green-500 text-black" : "border-gray-600 hover:border-brand-yellow"
                )}>
                  {item.isCompleted && <CheckCircle2 className="w-3 h-3" />}
                </div>
                <span className={cn("text-sm transition-all", item.isCompleted ? "text-white line-through opacity-50" : "text-white")}>
                  {item.text}
                </span>
              </div>
              {isTechnician && (
                <button 
                  onClick={() => deleteItem(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {isTechnician && (
        <form onSubmit={addItem} className="flex gap-2 mt-4 pt-4 border-t border-white/5">
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder="Nová položka..."
            className="flex-1 bg-[#111] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow/50"
          />
          <button
            type="submit"
            disabled={!newItemText.trim()}
            className="p-2 bg-white/5 text-white rounded-lg hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </form>
      )}
    </div>
  );
}
