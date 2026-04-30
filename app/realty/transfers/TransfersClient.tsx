'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, CheckCircle2, ArrowRight, User, MapPin } from 'lucide-react';
import { AnimatedItem } from '@/components/AnimatedItem';

type Property = {
  id: string;
  name: string;
  address: string | null;
  claimedBy: { id: string; name: string | null; email: string | null } | null;
  updatedAt: string;
};

export default function TransfersClient({ initialProperties }: { initialProperties: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);

  const handleConfirm = async (propertyId: string) => {
    setIsConfirming(propertyId);
    try {
      const res = await fetch(`/api/properties/${propertyId}/confirm-transfer`, {
        method: 'POST',
      });

      if (res.ok) {
        setProperties(properties.filter(p => p.id !== propertyId));
        alert('Převod byl úspěšně dokončen. Nemovitost nyní patří novému majiteli.');
      } else {
        alert('Chyba při potvrzování převodu');
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při potvrzování převodu');
    } finally {
      setIsConfirming(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-brand-yellow" />
          Čekající převody
        </h1>
        <p className="text-gray-400 text-sm mt-1">Potvrďte převod nemovitostí na nové majitele, kteří je nárokovali.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map((property, index) => (
          <AnimatedItem key={property.id} delay={index * 0.1} className="group bg-[#111] border border-white/10 hover:border-white/20 rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl hover:shadow-black/50">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-yellow/20 to-brand-yellow/5 flex items-center justify-center border border-brand-yellow/20 shrink-0">
                  <Home className="w-6 h-6 text-brand-yellow" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-yellow transition-colors line-clamp-1" title={property.name}>{property.name}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-400 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1" title={property.address || 'Bez adresy'}>{property.address || 'Bez adresy'}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#1A1A1A] rounded-xl p-4 mb-6 border border-white/5 flex-grow">
              <div className="flex items-center gap-2 text-gray-400 mb-3 text-xs uppercase tracking-wider font-semibold">
                <User className="w-4 h-4" />
                <span>Nový majitel</span>
              </div>
              <div className="space-y-1">
                <p className="text-white font-medium truncate" title={property.claimedBy?.name || 'Neznámé jméno'}>{property.claimedBy?.name || 'Neznámé jméno'}</p>
                <p className="text-sm text-gray-500 truncate" title={property.claimedBy?.email || ''}>{property.claimedBy?.email}</p>
              </div>
            </div>

            <button
              onClick={() => handleConfirm(property.id)}
              disabled={isConfirming === property.id}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold rounded-xl transition-all shadow-lg shadow-brand-yellow/20 active:scale-95 disabled:opacity-50 disabled:shadow-none mt-auto"
            >
              {isConfirming === property.id ? 'Zpracovávám...' : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Potvrdit převod
                </>
              )}
            </button>
          </AnimatedItem>
        ))}

        {properties.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 bg-[#111] border border-white/5 rounded-2xl text-center">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Žádné čekající převody</h3>
            <p className="text-gray-400 text-sm max-w-md">Všechny nárokované nemovitosti byly úspěšně převedeny nebo zatím žádné nečekají na vaše potvrzení.</p>
          </div>
        )}
      </div>
    </div>
  );
}
