'use client';

import { useState } from 'react';
import { Star, ChevronDown, ChevronUp, User } from 'lucide-react';
import Link from 'next/link';

export default function AdminRatingsClient({ technicians }: { technicians: any[] }) {
  const [expandedTechId, setExpandedTechId] = useState<string | null>(null);

  const techniciansWithStats = technicians.map(t => {
    const reviews = t.technicianReviews || [];
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length 
      : 0;
    return { ...t, avgRating, reviews };
  }).sort((a, b) => b.avgRating - a.avgRating);

  return (
    <div className="space-y-4">
      {techniciansWithStats.map(tech => (
        <div key={tech.id} className="bg-[#111] border border-white/5 rounded-xl overflow-hidden">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            onClick={() => setExpandedTechId(expandedTechId === tech.id ? null : tech.id)}
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-brand-yellow/10 text-brand-yellow flex items-center justify-center font-bold text-lg">
                {(tech.name?.[0] || tech.email?.[0] || 'T').toUpperCase()}
              </div>
              <div>
                <h3 className="text-white font-medium">{tech.name || 'Neznámý'}</h3>
                <p className="text-xs text-gray-500">{tech.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-brand-yellow font-bold text-lg">
                  {tech.avgRating > 0 ? tech.avgRating.toFixed(1) : '-'} <Star className="h-5 w-5 fill-brand-yellow" />
                </div>
                <div className="text-xs text-gray-500">{tech.reviews.length} hodnocení</div>
              </div>
              {expandedTechId === tech.id ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
            </div>
          </div>
          
          {expandedTechId === tech.id && (
            <div className="border-t border-white/5 bg-[#0a0a0a] p-4 space-y-4">
              <div className="flex justify-end">
                <Link href={`/admin/users?search=${encodeURIComponent(tech.email)}`} className="inline-flex items-center gap-2 text-xs text-brand-yellow hover:underline">
                  <User className="h-4 w-4" /> Detail uživatele
                </Link>
              </div>
              
              {tech.reviews.length === 0 ? (
                <p className="text-sm text-gray-500 italic text-center py-4">Tento technik zatím nemá žádná hodnocení.</p>
              ) : (
                <div className="grid gap-4">
                  {tech.reviews.map((r: any) => (
                    <div key={r.id} className="bg-[#161616] rounded-lg p-4 border border-white/5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-white">{r.customer?.name || r.customer?.email || 'Zákazník'}</p>
                          <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('cs-CZ')} • Objednávka {r.order?.readableId}</p>
                        </div>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star 
                              key={star} 
                              className={`h-4 w-4 ${star <= r.rating ? 'text-brand-yellow fill-brand-yellow' : 'text-gray-600'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-gray-300 mt-2 bg-white/5 p-3 rounded-md">{r.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {techniciansWithStats.length === 0 && (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <p className="text-gray-500">Zatím nejsou k dispozici žádní technici.</p>
        </div>
      )}
    </div>
  );
}
