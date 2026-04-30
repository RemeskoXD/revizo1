'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, CheckCircle2, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ClaimClient({ property, token }: { property: any, token: string }) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch('/api/properties/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        alert('Chyba při nárokování nemovitosti');
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při nárokování nemovitosti');
    } finally {
      setIsClaiming(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#1A1A1A] border border-white/10 p-8 rounded-3xl max-w-md text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold mb-4">Úspěšně nárokováno!</h1>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Požádali jste o převod nemovitosti <strong>{property.name}</strong>. 
            Nyní čekáme, až původní majitel ({property.owner?.name}) převod potvrdí.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-6 py-3.5 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
          >
            Přejít na nástěnku
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#111] text-white p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#1A1A1A] border border-white/10 p-8 rounded-3xl max-w-md w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-yellow/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-yellow/20 to-brand-yellow/5 rounded-2xl flex items-center justify-center border border-brand-yellow/20">
              <Home className="w-8 h-8 text-brand-yellow" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">Převzetí nemovitosti</h1>
          <p className="text-gray-400 text-center mb-8 text-sm leading-relaxed">
            Uživatel <strong className="text-white">{property.owner?.name}</strong> vám chce předat správu nad následující nemovitostí a jejími revizemi.
          </p>

          <div className="bg-[#111] border border-white/10 rounded-2xl p-5 mb-8">
            <h3 className="font-bold text-white mb-1 text-lg">{property.name}</h3>
            <p className="text-sm text-gray-400">{property.address || 'Bez adresy'}</p>
            {property.description && (
              <p className="text-sm text-gray-500 mt-3 pt-3 border-t border-white/5 leading-relaxed">{property.description}</p>
            )}
          </div>

          <button
            onClick={handleClaim}
            disabled={isClaiming}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            {isClaiming ? 'Zpracovávám...' : (
              <>
                Přijmout nemovitost
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
