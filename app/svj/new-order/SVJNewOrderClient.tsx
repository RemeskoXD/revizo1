'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, FileText, ArrowLeft, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';

type BuildingOption = {
  id: string;
  name: string;
  address: string | null;
};

const SERVICE_TYPES = [
  'Elektroinstalace - společné prostory',
  'Elektroinstalace - Bytový dům',
  'Plynové zařízení',
  'Hromosvod',
  'Komíny',
  'Hasicí přístroje',
  'Požární bezpečnost',
  'Výtahy',
  'Tlaková zařízení',
  'Komplexní revize celého domu',
];

export default function SVJNewOrderClient({ buildings }: { buildings: BuildingOption[] }) {
  const router = useRouter();
  const [selectedBuilding, setSelectedBuilding] = useState(buildings[0]?.id || '');
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [preferredDate, setPreferredDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const building = buildings.find(b => b.id === selectedBuilding);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding) {
      alert('Vyberte budovu');
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/properties/${selectedBuilding}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceType,
          propertyType: 'Bytový dům',
          address: building?.address || building?.name || '',
          notes,
          preferredDate: preferredDate || undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/svj/buildings/${selectedBuilding}`);
        }, 2000);
      } else {
        alert('Chyba při vytváření objednávky');
      }
    } catch {
      alert('Chyba při vytváření objednávky');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (buildings.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/svj" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group">
            <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Nová objednávka</h1>
        </div>
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-12 text-center">
          <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Nejdříve přidejte budovu</h3>
          <p className="text-gray-500 mb-6">Pro objednání revize musíte mít alespoň jednu budovu.</p>
          <Link href="/svj/buildings" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
            <Plus className="w-5 h-5" /> Přidat budovu
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-12 text-center max-w-md"
        >
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Objednávka vytvořena!</h2>
          <p className="text-gray-400">Přesměrovávám na detail budovy...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/svj" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group">
          <ArrowLeft className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nová objednávka revize</h1>
          <p className="text-gray-400 text-sm">Objednejte revizi pro váš bytový dům</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-brand-yellow" />
            Vyberte budovu
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {buildings.map(b => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBuilding(b.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  selectedBuilding === b.id
                    ? 'bg-brand-yellow/10 border-brand-yellow/30 ring-1 ring-brand-yellow/20'
                    : 'bg-[#111] border-white/10 hover:border-white/20'
                }`}
              >
                <p className={`text-sm font-medium ${selectedBuilding === b.id ? 'text-brand-yellow' : 'text-white'}`}>{b.name}</p>
                {b.address && <p className="text-xs text-gray-500 mt-1 truncate">{b.address}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-yellow" />
            Detail revize
          </h2>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Typ revize</label>
            <select
              value={serviceType}
              onChange={e => setServiceType(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
            >
              {SERVICE_TYPES.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Preferovaný termín (volitelné)</label>
            <input
              type="date"
              value={preferredDate}
              onChange={e => setPreferredDate(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">Poznámka (volitelné)</label>
            <textarea
              placeholder="Upřesněte požadavky – přístup do společných prostor, kontakt na správce, specifické prostory k revizi..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all min-h-[120px] resize-y"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/svj" className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors border border-white/10">
            Zrušit
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || !selectedBuilding}
            className="flex-1 px-6 py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold rounded-xl transition-all shadow-lg shadow-brand-yellow/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Objednat revizi'}
          </button>
        </div>
      </form>
    </div>
  );
}
