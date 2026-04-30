'use client';

import { useState } from 'react';
import {
  FileText, Building, MapPin, CalendarClock, ShieldCheck, AlertTriangle,
  XCircle, Filter, Eye
} from 'lucide-react';
import Link from 'next/link';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

type Revision = {
  id: string;
  readableId: string;
  serviceType: string;
  address: string;
  buildingName: string;
  buildingId: string;
  categoryName: string | null;
  intervalMonths: number;
  completedAt: string;
  expiresAt: string;
  daysLeft: number;
  hasReport: boolean;
  result: string | null;
  status: 'expired' | 'warning' | 'soon' | 'ok';
};

export default function RevisionsClient({ revisions }: { revisions: Revision[] }) {
  const [filter, setFilter] = useState<'all' | 'expired' | 'warning' | 'ok'>('all');

  const filtered = filter === 'all'
    ? revisions
    : revisions.filter(r => filter === 'ok' ? (r.status === 'ok' || r.status === 'soon') : r.status === filter);

  const expiredCount = revisions.filter(r => r.status === 'expired').length;
  const warningCount = revisions.filter(r => r.status === 'warning').length;
  const okCount = revisions.filter(r => r.status === 'ok' || r.status === 'soon').length;

  return (
    <div className="space-y-6">
      <div className="bg-[#1A1A1A] p-6 rounded-2xl border border-white/5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Eye className="w-6 h-6 text-brand-yellow" />
          Přehled revizí
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Kompletní přehled všech dokončených revizí a jejich platnosti napříč všemi budovami.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg border transition-colors",
            filter === 'all' ? "bg-white/10 border-white/20 text-white" : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/10"
          )}
        >
          Všechny ({revisions.length})
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5",
            filter === 'expired' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/10"
          )}
        >
          <XCircle className="w-3.5 h-3.5" /> Expirované ({expiredCount})
        </button>
        <button
          onClick={() => setFilter('warning')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5",
            filter === 'warning' ? "bg-orange-500/10 border-orange-500/20 text-orange-400" : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/10"
          )}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Brzy vyprší ({warningCount})
        </button>
        <button
          onClick={() => setFilter('ok')}
          className={cn("px-4 py-2 text-sm font-medium rounded-lg border transition-colors flex items-center gap-1.5",
            filter === 'ok' ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-transparent border-white/5 text-gray-400 hover:text-white hover:border-white/10"
          )}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Platné ({okCount})
        </button>
      </div>

      {/* Revisions list */}
      <div className="space-y-3">
        {filtered.map((rev, idx) => (
          <AnimatedItem key={rev.id} delay={idx * 0.03}>
            <div className={cn(
              "bg-[#1A1A1A] border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all hover:shadow-lg",
              rev.status === 'expired' ? "border-red-500/20" :
              rev.status === 'warning' ? "border-orange-500/20" :
              "border-white/5"
            )}>
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                rev.status === 'expired' ? "bg-red-500/10" :
                rev.status === 'warning' ? "bg-orange-500/10" :
                "bg-green-500/10"
              )}>
                {rev.status === 'expired' ? <XCircle className="w-5 h-5 text-red-500" /> :
                 rev.status === 'warning' ? <AlertTriangle className="w-5 h-5 text-orange-500" /> :
                 <ShieldCheck className="w-5 h-5 text-green-500" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{rev.serviceType}</span>
                  <span className="text-[10px] text-gray-500 font-mono">#{rev.readableId}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Building className="w-3 h-3" /> {rev.buildingName}
                  </span>
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {rev.address}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <CalendarClock className={cn("w-3.5 h-3.5",
                      rev.status === 'expired' ? "text-red-500" :
                      rev.status === 'warning' ? "text-orange-500" : "text-gray-500"
                    )} />
                    <span className={cn("text-xs font-medium",
                      rev.status === 'expired' ? "text-red-400" :
                      rev.status === 'warning' ? "text-orange-400" : "text-gray-400"
                    )}>
                      {rev.daysLeft <= 0 ? `Expirováno ${Math.abs(rev.daysLeft)}d` : `${rev.daysLeft} dní`}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    Platí do {new Date(rev.expiresAt).toLocaleDateString('cs-CZ')}
                  </p>
                </div>

                {(rev.status === 'expired' || rev.status === 'warning') && (
                  <Link href="/svj/new-order" className={cn("text-[10px] text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors",
                    rev.status === 'expired' ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
                  )}>
                    OBJEDNAT
                  </Link>
                )}
              </div>
            </div>
          </AnimatedItem>
        ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-[#1A1A1A] border border-white/5 rounded-2xl text-center">
            <FileText className="w-10 h-10 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Žádné revize</h3>
            <p className="text-gray-500 text-sm">
              {filter === 'all' ? 'Zatím nemáte žádné dokončené revize.' : 'V této kategorii nejsou žádné revize.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
