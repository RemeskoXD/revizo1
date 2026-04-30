'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Home, Plus, Link as LinkIcon, CheckCircle2, Copy, FileText, ArrowRight, MapPin, Calendar, Clock } from 'lucide-react';
import { AnimatedItem } from '@/components/AnimatedItem';
import Link from 'next/link';

type Order = any; // Simplify for now
type Property = {
  id: string;
  name: string;
  address: string | null;
  description: string | null;
  transferToken: string | null;
  transferStatus: string | null;
  claimedBy: { id: string; name: string | null; email: string | null } | null;
  orders: Order[];
  createdAt: string;
};

export default function PropertiesClient({ initialProperties }: { initialProperties: Property[] }) {
  const [properties, setProperties] = useState<Property[]>(initialProperties);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProperty, setNewProperty] = useState({ name: '', address: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProperty),
      });
      if (res.ok) {
        const created = await res.json();
        setProperties([created, ...properties]);
        setIsAddModalOpen(false);
        setNewProperty({ name: '', address: '', description: '' });
      } else {
        alert('Chyba při vytváření nemovitosti');
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při vytváření nemovitosti');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateLink = async (propertyId: string) => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/generate-link`, { method: 'POST' });
      if (res.ok) {
        const updated = await res.json();
        setProperties(properties.map(p => p.id === propertyId ? { ...p, transferToken: updated.transferToken, transferStatus: updated.transferStatus } : p));
      }
    } catch (error) {
      console.error(error);
      alert('Chyba při generování odkazu');
    }
  };

  const copyToClipboard = (token: string) => {
    const url = `${window.location.origin}/claim-property?token=${token}`;
    navigator.clipboard.writeText(url);
    alert('Odkaz zkopírován do schránky!');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#1A1A1A] p-6 rounded-2xl border border-white/5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Home className="w-6 h-6 text-brand-yellow" />
            Moje nemovitosti
          </h1>
          <p className="text-gray-400 text-sm mt-1">Spravujte své nemovitosti, revize a převody vlastnictví.</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-yellow text-black font-semibold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Přidat nemovitost
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {properties.map((property, index) => (
          <AnimatedItem key={property.id} delay={index * 0.1} className="group bg-[#111] border border-white/10 hover:border-white/20 rounded-2xl p-6 flex flex-col transition-all hover:shadow-xl hover:shadow-black/50">
            <div className="flex items-start justify-between mb-5">
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
              {property.transferStatus === 'CLAIMED' && (
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20">
                  Převod
                </span>
              )}
              {property.transferStatus === 'PENDING' && (
                <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20">
                  Čeká
                </span>
              )}
            </div>

            <p className="text-sm text-gray-500 mb-6 flex-grow line-clamp-3 leading-relaxed">
              {property.description || <span className="italic opacity-50">Bez popisu</span>}
            </p>

            <div className="space-y-4 mt-auto pt-4 border-t border-white/5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Vytvořeno</span>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(property.createdAt).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-gray-500 text-xs uppercase tracking-wider font-semibold">Revize</span>
                  <div className="flex items-center gap-1.5 text-gray-300">
                    <FileText className="w-3.5 h-3.5" />
                    {property.orders?.length || 0} záznamů
                  </div>
                </div>
              </div>

              {property.transferStatus === 'CLAIMED' ? (
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-bold">Čeká na potvrzení převodu</span>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2.5 mb-3">
                    <p className="text-xs text-gray-400 mb-0.5">Nárokoval:</p>
                    <p className="text-sm text-white font-medium truncate">{property.claimedBy?.name || 'Neznámý uživatel'}</p>
                    <p className="text-xs text-gray-500 truncate">{property.claimedBy?.email}</p>
                  </div>
                  <Link href="/realty/transfers" className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-sm font-medium rounded-lg transition-colors">
                    Přejít k potvrzení <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : property.transferToken ? (
                <div className="p-4 bg-brand-yellow/5 border border-brand-yellow/20 rounded-xl">
                  <div className="flex items-center gap-2 text-brand-yellow mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-semibold">Čeká na nárokování</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Odkaz pro nového majitele je připraven.</p>
                  <button 
                    onClick={() => copyToClipboard(property.transferToken!)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-yellow/10 hover:bg-brand-yellow/20 text-brand-yellow text-sm font-medium rounded-lg transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Zkopírovat odkaz
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleGenerateLink(property.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-xl transition-colors border border-white/10"
                >
                  <LinkIcon className="w-4 h-4" />
                  Vygenerovat odkaz pro převod
                </button>
              )}

              <Link 
                href={`/realty/properties/${property.id}`}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] text-white text-sm font-medium rounded-xl transition-colors border border-white/10 group-hover:border-white/20"
              >
                <FileText className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                Spravovat revize
              </Link>
            </div>
          </AnimatedItem>
        ))}

        {properties.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 px-4 bg-[#111] border border-white/5 rounded-2xl text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Home className="w-10 h-10 text-gray-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Zatím nemáte žádné nemovitosti</h3>
            <p className="text-gray-400 text-sm max-w-md mb-8">Přidejte svou první nemovitost a začněte spravovat její revize, dokumenty a případné převody na nové majitele.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-bold rounded-xl hover:bg-brand-yellow-hover transition-all shadow-lg shadow-brand-yellow/20 active:scale-95"
            >
              <Plus className="w-5 h-5" />
              Přidat první nemovitost
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Home className="w-5 h-5 text-brand-yellow" />
                Nová nemovitost
              </h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateProperty} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Název nemovitosti</label>
                <input
                  type="text"
                  required
                  placeholder="např. Byt 3+1 Praha, Dům u jezera"
                  value={newProperty.name}
                  onChange={e => setNewProperty({ ...newProperty, name: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Adresa</label>
                <input
                  type="text"
                  placeholder="Ulice, Město, PSČ"
                  value={newProperty.address}
                  onChange={e => setNewProperty({ ...newProperty, address: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1.5">Popis (volitelné)</label>
                <textarea
                  placeholder="Doplňující informace o nemovitosti..."
                  value={newProperty.description}
                  onChange={e => setNewProperty({ ...newProperty, description: e.target.value })}
                  className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow transition-all min-h-[120px] resize-y"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-brand-yellow hover:bg-brand-yellow-hover text-black font-bold rounded-xl transition-all shadow-lg shadow-brand-yellow/20 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSubmitting ? 'Ukládám...' : 'Přidat nemovitost'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
