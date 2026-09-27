'use client';

import { useMemo, useState } from 'react';
import { Star, ChevronDown, ChevronUp, User, Search, X, AlertTriangle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AdminRatingsClient({ technicians }: { technicians: any[] }) {
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState<'all' | 'with-reviews' | 'high' | 'low'>('all');

  const techniciansWithStats = useMemo(() => {
    return technicians.map(t => {
      const reviews = t.technicianReviews || [];
      const avgRating = reviews.length > 0 
        ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length 
        : 0;
      return { ...t, avgRating, reviews };
    }).sort((a, b) => b.avgRating - a.avgRating);
  }, [technicians]);

  const filteredTechnicians = useMemo(() => {
    return techniciansWithStats.filter(tech => {
      if (filterRating === 'with-reviews' && tech.reviews.length === 0) return false;
      if (filterRating === 'high' && (tech.avgRating < 4.5 || tech.reviews.length === 0)) return false;
      if (filterRating === 'low' && (tech.avgRating >= 3.5 || tech.reviews.length === 0)) return false;

      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      const name = (tech.name || '').toLowerCase();
      const email = (tech.email || '').toLowerCase();
      const phone = (tech.phone || '').toLowerCase();
      const matchReview = tech.reviews.some((r: any) => 
        (r.comment || '').toLowerCase().includes(q) ||
        (r.customer?.name || '').toLowerCase().includes(q) ||
        (r.customer?.email || '').toLowerCase().includes(q) ||
        (r.order?.readableId || '').toLowerCase().includes(q)
      );
      return name.includes(q) || email.includes(q) || phone.includes(q) || matchReview;
    });
  }, [techniciansWithStats, search, filterRating]);

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat technika, e-mail, hodnocení nebo zákazníka…"
            className="w-full rounded-xl border border-white/10 bg-[#161616] py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:border-white/30 focus:outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              title="Vymazat vyhledávání"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Rating filter tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#161616] p-1 text-xs">
          {[
            { id: 'all', label: 'Všichni' },
            { id: 'with-reviews', label: 'S recenzí' },
            { id: 'high', label: 'Top (4.5+)' },
            { id: 'low', label: 'Nízké (<3.5)' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterRating(tab.id as any)}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-all",
                filterRating === tab.id
                  ? 'bg-brand-yellow text-black font-bold shadow-sm'
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filteredTechnicians.map(tech => (
          <div key={tech.id} className="rounded-2xl border border-white/10 bg-[#161616] overflow-hidden shadow-sm transition-all">
            <div 
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors min-h-[56px]"
              onClick={() => setExpandedTechId(expandedTechId === tech.id ? null : tech.id)}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-10 w-10 shrink-0 rounded-full bg-brand-yellow/10 text-brand-yellow flex items-center justify-center font-bold text-base">
                  {(tech.name?.[0] || tech.email?.[0] || 'T').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">{tech.name || 'Neznámý'}</h3>
                  <p className="text-xs text-gray-500 font-mono truncate">{tech.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                <div className="flex flex-col items-end">
                  <div className="flex items-center gap-1 text-brand-yellow font-bold text-base sm:text-lg">
                    {tech.avgRating > 0 ? tech.avgRating.toFixed(1) : '–'} <Star className="h-4 w-4 fill-brand-yellow text-brand-yellow" />
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {tech.reviews.length} {tech.reviews.length === 1 ? 'hodnocení' : tech.reviews.length < 5 ? 'hodnocení' : 'hodnocení'}
                  </div>
                </div>
                {expandedTechId === tech.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </div>
            </div>
            
            {expandedTechId === tech.id && (
              <div className="border-t border-white/5 bg-[#121212] p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Přehled recenzí ({tech.reviews.length})
                  </span>
                  <Link 
                    href={`/admin/users?search=${encodeURIComponent(tech.email)}`} 
                    className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-brand-yellow hover:bg-white/10"
                  >
                    <User className="h-3.5 w-3.5" /> Profil uživatele
                  </Link>
                </div>
                
                {tech.reviews.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-4">Tento technik zatím nemá žádná hodnocení od zákazníků.</p>
                ) : (
                  <div className="grid gap-3">
                    {tech.reviews.map((r: any) => (
                      <div key={r.id} className="rounded-xl border border-white/5 bg-[#1a1a1a] p-3.5">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {r.customer?.name || r.customer?.email || 'Zákazník'}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span>{new Date(r.createdAt).toLocaleDateString('cs-CZ')}</span>
                              {r.order?.readableId && (
                                <>
                                  <span>•</span>
                                  <Link
                                    href={`/admin/orders?search=${r.order.readableId}`}
                                    className="font-mono text-brand-yellow hover:underline"
                                  >
                                    #{r.order.readableId}
                                  </Link>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`h-3.5 w-3.5 ${star <= r.rating ? 'text-brand-yellow fill-brand-yellow' : 'text-gray-600'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        {r.comment && (
                          <p className="text-xs text-gray-300 mt-2 rounded-lg bg-black/30 p-2.5 leading-relaxed">
                            {r.comment}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {filteredTechnicians.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-[#141414] p-8 text-gray-500 text-sm">
            Nebyly nalezeny žádné záznamy odpovídající hledání.
          </div>
        )}
      </div>
    </div>
  );
}
