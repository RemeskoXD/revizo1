'use client';

import { 
  ClipboardList, CheckCircle2, DollarSign, MapPin, Calendar, 
  ArrowRight, Phone, Navigation, Clock, Briefcase, TrendingUp,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

export default function TechnicianDashboardClient({ 
  user, openJobsCount, completedTotal, monthlyEarnings, monthlyCount, 
  pendingEarnings, publicQueue, publicQueueCount, todaysJobs 
}: any) {

  const statusLabel = (s: string) => ({
    'IN_PROGRESS': 'Probíhá', 'NEEDS_REVISION': 'K přepracování', 'PENDING': 'Čeká',
  }[s] || s);

  const statusColor = (s: string) => ({
    'IN_PROGRESS': 'bg-blue-500/10 text-blue-500',
    'NEEDS_REVISION': 'bg-orange-500/10 text-orange-500',
  }[s] || 'bg-yellow-500/10 text-yellow-500');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Ahoj, {user?.name?.split(' ')[0] || 'Techniku'} ⚡</h1>
          <p className="text-gray-400 mt-1">
            {openJobsCount > 0 
              ? <>{openJobsCount} {openJobsCount === 1 ? 'zakázka čeká' : 'zakázek čeká'} na vyřízení</>
              : 'Žádné aktivní zakázky'}
            {publicQueueCount > 0 && <> · <span className="text-brand-yellow">{publicQueueCount} nových poptávek</span></>}
          </p>
        </div>
        <Link href="/technician/queue" className="px-4 py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors flex items-center gap-2">
          <ClipboardList className="w-4 h-4" /> Všechny zakázky
        </Link>
      </div>

      {/* Stats - 4 compact cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <ClipboardList className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-white">{openJobsCount}</p>
            <p className="text-xs text-gray-500">Otevřené</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.15}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <CheckCircle2 className="w-4 h-4 text-green-500 mb-2" />
            <p className="text-2xl font-bold text-white">{completedTotal}</p>
            <p className="text-xs text-gray-500">Dokončeno celkem</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className="bg-[#1A1A1A] border border-brand-yellow/20 rounded-xl p-4">
            <DollarSign className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-brand-yellow">{monthlyEarnings.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500">Tento měsíc ({monthlyCount} revizí)</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.25}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <TrendingUp className="w-4 h-4 text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-white">{pendingEarnings.toLocaleString('cs-CZ')} Kč</p>
            <p className="text-xs text-gray-500">Čeká na dokončení</p>
          </div>
        </AnimatedItem>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Today's Jobs - takes more space */}
        <AnimatedItem delay={0.3} className="lg:col-span-3">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-brand-yellow" /> Moje zakázky
              </h3>
              <Link href="/technician/queue" className="text-xs text-brand-yellow hover:underline">Vše →</Link>
            </div>
            <div className="space-y-2">
              {todaysJobs.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">Žádné aktivní zakázky.</p>
              ) : (
                todaysJobs.map((job: any, index: number) => (
                  <motion.div 
                    key={job.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link href={`/technician/job/${job.readableId}`} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group">
                      <div className={cn("w-1.5 h-8 rounded-full shrink-0",
                        job.status === 'IN_PROGRESS' ? "bg-blue-500" :
                        job.status === 'NEEDS_REVISION' ? "bg-orange-500" : "bg-yellow-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{job.serviceType}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusColor(job.status))}>{statusLabel(job.status)}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 truncate"><MapPin className="w-3 h-3 inline" /> {job.address}</span>
                          {job.scheduledDate && (
                            <span className="text-xs text-brand-yellow shrink-0"><Clock className="w-3 h-3 inline" /> {new Date(job.scheduledDate).toLocaleString('cs-CZ', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.customer?.phone && (
                          <a href={`tel:${job.customer.phone}`} onClick={(e) => e.stopPropagation()} className="p-1.5 text-gray-500 hover:text-green-500 hover:bg-green-500/10 rounded-lg transition-colors" title="Zavolat">
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <a href={`https://maps.google.com/?q=${encodeURIComponent(job.confirmedAddress || job.address)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Navigovat">
                          <Navigation className="w-4 h-4" />
                        </a>
                        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </AnimatedItem>

        {/* Public Queue */}
        <AnimatedItem delay={0.4} className="lg:col-span-2">
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-brand-yellow" /> Volné poptávky
              </h3>
              {publicQueueCount > 0 && <span className="text-xs bg-brand-yellow text-black font-bold px-2 py-0.5 rounded-full">{publicQueueCount}</span>}
            </div>
            <div className="space-y-2">
              {publicQueue.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">Žádné nové poptávky.</p>
              ) : (
                publicQueue.map((req: any, index: number) => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <Link href={`/technician/job/${req.readableId}`} className="block p-3 bg-[#111] rounded-lg border border-white/5 hover:border-brand-yellow/30 transition-all group">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white group-hover:text-brand-yellow transition-colors">{req.serviceType}</span>
                        <span className="text-xs font-bold text-brand-yellow">{req.price ? `${req.price.toLocaleString('cs-CZ')} Kč` : '–'}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate"><MapPin className="w-3 h-3 inline" /> {req.address}</p>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </AnimatedItem>
      </div>
    </div>
  );
}
