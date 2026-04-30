'use client';

import { useState, useMemo } from 'react';
import { Search, MapPin, Calendar, Clock, ChevronRight, Phone, DollarSign, Navigation, Filter } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

const STATUS_TABS = [
  { value: 'active', label: 'Aktivní' },
  { value: 'public', label: 'Volné poptávky' },
  { value: 'completed', label: 'Dokončené' },
  { value: 'all', label: 'Vše' },
];

export default function TechnicianQueueClient({ jobs, technicianId }: { jobs: any[], technicianId: string }) {
  const [tab, setTab] = useState('active');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = jobs;

    if (tab === 'active') {
      result = result.filter(j => j.technicianId === technicianId && ['PENDING', 'IN_PROGRESS', 'NEEDS_REVISION'].includes(j.status));
    } else if (tab === 'public') {
      result = result.filter(j => j.isPublic && j.status === 'PENDING' && j.technicianId !== technicianId);
    } else if (tab === 'completed') {
      result = result.filter(j => j.status === 'COMPLETED');
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j => 
        j.address?.toLowerCase().includes(q) || 
        j.serviceType?.toLowerCase().includes(q) ||
        j.readableId?.toLowerCase().includes(q) ||
        j.customer?.name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [jobs, tab, search, technicianId]);

  const statusLabel = (s: string) => ({
    'COMPLETED': 'Dokončeno', 'IN_PROGRESS': 'Probíhá', 'NEEDS_REVISION': 'K přepracování', 'CANCELLED': 'Zrušeno',
  }[s] || 'Čeká');

  const statusColor = (s: string) => ({
    'COMPLETED': 'bg-green-500/10 text-green-500',
    'IN_PROGRESS': 'bg-blue-500/10 text-blue-500',
    'NEEDS_REVISION': 'bg-orange-500/10 text-orange-500',
    'CANCELLED': 'bg-red-500/10 text-red-500',
  }[s] || 'bg-yellow-500/10 text-yellow-500');

  return (
    <div className="space-y-5">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-white sm:text-2xl">Moje zakázky</h1>
        <p className="text-sm text-gray-400">Správa přidělených revizí a nových poptávek.</p>
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="table-scroll flex max-w-full flex-nowrap gap-1 rounded-lg border border-white/5 bg-[#1A1A1A] p-1 lg:min-w-0 lg:flex-1">
          {STATUS_TABS.map((t) => (
            <button key={t.value} onClick={() => setTab(t.value)} className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
              tab === t.value ? "bg-brand-yellow text-black" : "text-gray-400 hover:text-white hover:bg-white/5"
            )}>
              {t.label}
              {t.value === 'public' && jobs.filter(j => j.isPublic && j.status === 'PENDING' && j.technicianId !== technicianId).length > 0 && (
                <span className="ml-1.5 bg-brand-yellow/20 text-brand-yellow text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {jobs.filter(j => j.isPublic && j.status === 'PENDING' && j.technicianId !== technicianId).length}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Hledat adresu, typ, zákazníka..." className="w-full bg-[#1A1A1A] border border-white/10 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-yellow/50" />
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-[#1A1A1A] border border-white/5 rounded-xl">
            <p className="text-gray-500">{search ? 'Žádné zakázky neodpovídají hledání.' : 'Žádné zakázky v této kategorii.'}</p>
          </div>
        ) : (
          filtered.map((job, index) => {
            const isPublicJob = job.isPublic && job.status === 'PENDING' && job.technicianId !== technicianId;
            
            return (
              <motion.div key={job.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: index * 0.03 }}>
                <div className={cn(
                  "bg-[#1A1A1A] border rounded-xl p-4 transition-all hover:shadow-lg group",
                  isPublicJob ? "border-brand-yellow/20 hover:border-brand-yellow/50" : "border-white/5 hover:border-white/10"
                )}>
                  <div className="flex items-center gap-4">
                    {/* Status bar */}
                    <div className={cn("w-1 h-12 rounded-full shrink-0",
                      job.status === 'COMPLETED' ? "bg-green-500" :
                      job.status === 'IN_PROGRESS' ? "bg-blue-500" :
                      job.status === 'NEEDS_REVISION' ? "bg-orange-500" :
                      isPublicJob ? "bg-brand-yellow" : "bg-yellow-500"
                    )} />

                    {/* Main info */}
                    <Link href={`/technician/job/${job.readableId}`} className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white group-hover:text-brand-yellow transition-colors">{job.serviceType}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusColor(job.status))}>
                          {isPublicJob ? 'Volná poptávka' : statusLabel(job.status)}
                        </span>
                        <span className="text-[10px] font-mono text-gray-600">#{job.readableId}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="truncate"><MapPin className="w-3 h-3 inline mr-0.5" />{job.address}</span>
                        {job.customer?.name && <span className="shrink-0">{job.customer.name}</span>}
                      </div>
                    </Link>

                    {/* Right side - schedule + price + actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      {job.scheduledDate && (
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-brand-yellow font-medium">
                            <Clock className="w-3 h-3 inline mr-0.5" />
                            {new Date(job.scheduledDate).toLocaleDateString('cs-CZ')}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {new Date(job.scheduledDate).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                      {job.price && (
                        <span className="text-sm font-bold text-brand-yellow hidden sm:block">{job.price.toLocaleString('cs-CZ')} Kč</span>
                      )}

                      {/* Quick actions */}
                      {job.customer?.phone && (
                        <a href={`tel:${job.customer.phone}`} className="p-2 text-gray-500 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Zavolat zákazníkovi">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <a href={`https://maps.google.com/?q=${encodeURIComponent(job.confirmedAddress || job.address)}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Navigovat">
                        <Navigation className="w-4 h-4" />
                      </a>
                      <Link href={`/technician/job/${job.readableId}`}>
                        <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" />
                      </Link>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
