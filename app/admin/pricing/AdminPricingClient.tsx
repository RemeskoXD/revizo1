'use client';

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, Loader2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getAppBaseUrl } from '@/lib/stripe-config';

type SubscriptionPlanKey = 'CUSTOMER' | 'TECHNICIAN' | 'COMPANY_ADMIN';

export default function AdminPricingClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [subscriptions, setSubscriptions] = useState<Record<SubscriptionPlanKey, { label: string; yearlyPriceCzk: number }>>({
    CUSTOMER: { label: 'Zákazník', yearlyPriceCzk: 199 },
    TECHNICIAN: { label: 'Technik', yearlyPriceCzk: 899 },
    COMPANY_ADMIN: { label: 'Firma', yearlyPriceCzk: 1199 },
  });

  const [services, setServices] = useState<any[]>([]);
  const [urgentSurcharge, setUrgentSurcharge] = useState(2000);

  useEffect(() => {
    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.subscriptions) setSubscriptions(data.subscriptions);
        if (data.services) setServices(data.services);
        if (data.urgentSurcharge !== undefined) setUrgentSurcharge(data.urgentSurcharge);
      })
      .catch(err => console.error('Error fetching pricing:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptions, services, urgentSurcharge }),
      });
      if (res.ok) {
        toast.success('Ceník byl úspěšně uložen.');
      } else {
        toast.error('Chyba při ukládání ceníku.');
      }
    } catch (e) {
      toast.error('Nastala neočekávaná chyba.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubChange = (key: SubscriptionPlanKey, field: 'label' | 'yearlyPriceCzk', value: string | number) => {
    setSubscriptions(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }));
  };

  const handleServiceChange = (id: string, field: string, value: string | number) => {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  if (loading) {
    return <div className="flex h-32 items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-brand-yellow" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ceník & Produkty</h1>
          <p className="text-sm text-gray-400">Nastavení cen předplatného a revizí pro uživatele.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 font-semibold text-black hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Uložit změny
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Subscriptions */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Roční předplatné</h2>
          <div className="rounded-xl border border-white/5 bg-[#111] p-4 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
              <p className="text-xs text-blue-200">
                Lze upravit cenu, která se zobrazuje všude v aplikaci. 
                Nezapomeňte aktualizovat cenu i přímo ve Stripe administraci, 
                protože samotnou platbu zpracovává právě Stripe na základě nastaveného "Price ID".
              </p>
            </div>
            
            {(Object.keys(subscriptions) as SubscriptionPlanKey[]).map(key => (
              <div key={key} className="space-y-2 border-b border-white/5 pb-4 last:border-0 last:pb-0">
                <label className="text-sm font-medium text-gray-400">{key}</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <span className="text-xs text-gray-500">Název / Popis</span>
                    <input
                      type="text"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg p-2 text-white focus:border-brand-yellow outline-none mt-1 text-sm"
                      value={subscriptions[key].label}
                      onChange={e => handleSubChange(key, 'label', e.target.value)}
                    />
                  </div>
                  <div className="w-32">
                    <span className="text-xs text-gray-500">Cena (Kč)</span>
                    <input
                      type="number"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg p-2 text-white focus:border-brand-yellow outline-none mt-1 text-sm"
                      value={subscriptions[key].yearlyPriceCzk}
                      onChange={e => handleSubChange(key, 'yearlyPriceCzk', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Settings */}
        <div className="space-y-4">
           <h2 className="text-xl font-semibold text-white">Obecná nastavení</h2>
           <div className="rounded-xl border border-white/5 bg-[#111] p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Příplatek za urgentní termín (Kč)</label>
                 <input
                      type="number"
                      className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg p-2 text-white focus:border-brand-yellow outline-none mt-1"
                      value={urgentSurcharge}
                      onChange={e => setUrgentSurcharge(parseInt(e.target.value) || 0)}
                    />
              </div>
           </div>
        </div>
      </div>

      {/* Services */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Jednorázové platby za typ revize</h2>
        <div className="rounded-xl border border-white/5 bg-[#111] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white/5 text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Kód služby</th>
                  <th className="px-4 py-3 font-medium">Název</th>
                  <th className="px-4 py-3 font-medium">Kategorie</th>
                  <th className="px-4 py-3 font-medium">Základní cena (Kč)</th>
                  <th className="px-4 py-3 font-medium w-full">Zobrazená cena (text)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td className="px-4 py-3 font-mono text-xs">{svc.id}</td>
                    <td className="px-4 py-3">
                       <input
                          type="text"
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow outline-none w-full min-w-[200px]"
                          value={svc.label}
                          onChange={e => handleServiceChange(svc.id, 'label', e.target.value)}
                        />
                    </td>
                    <td className="px-4 py-3">
                        <input
                          type="text"
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow outline-none w-[100px]"
                          value={svc.group}
                          onChange={e => handleServiceChange(svc.id, 'group', e.target.value)}
                        />
                    </td>
                    <td className="px-4 py-3">
                        <input
                          type="number"
                          className="bg-[#1A1A1A] border border-white/10 rounded-lg px-2 py-1 focus:border-brand-yellow outline-none w-24"
                          value={svc.priceValue}
                          onChange={e => handleServiceChange(svc.id, 'priceValue', parseInt(e.target.value) || 0)}
                        />
                    </td>
                    <td className="px-4 py-3">
                        <input
                          type="text"
                          className="bg-transparent border-b border-transparent focus:border-brand-yellow outline-none w-full min-w-[200px]"
                          value={svc.price}
                          placeholder="např. od 2 500 Kč"
                          onChange={e => handleServiceChange(svc.id, 'price', e.target.value)}
                        />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
