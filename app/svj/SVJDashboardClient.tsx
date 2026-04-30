'use client';

import {
  Building, ShieldCheck, AlertTriangle, Clock, ArrowRight, Plus,
  XCircle, MapPin, CalendarClock, Eye, FileText, CheckCircle2, Bell
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

const HEALTH_CONFIG = {
  green: { label: 'OK', bg: 'bg-green-500', border: 'border-green-500/30', text: 'text-green-500', dot: 'bg-green-500' },
  orange: { label: 'Brzy vyprší', bg: 'bg-orange-500', border: 'border-orange-500/30', text: 'text-orange-500', dot: 'bg-orange-500 animate-pulse' },
  red: { label: 'Expirováno', bg: 'bg-red-500', border: 'border-red-500/30', text: 'text-red-500', dot: 'bg-red-500' },
  unknown: { label: 'Bez revizí', bg: 'bg-gray-500', border: 'border-gray-500/30', text: 'text-gray-500', dot: 'bg-gray-500' },
};

interface UpcomingRevision {
  id: string;
  readableId: string;
  serviceType: string;
  address: string;
  buildingName: string;
  buildingId: string;
  categoryName: string | null;
  completedAt: string;
  expiresAt: string;
  daysLeft: number;
  status: 'expired' | 'warning' | 'soon' | 'ok';
}

export default function SVJDashboardClient({
  userName, buildings, totalBuildings, totalRevisions, activeOrders,
  expiredCount, soonExpiringCount, upcomingRevisions,
}: {
  userName: string | null | undefined;
  buildings: any[];
  totalBuildings: number;
  totalRevisions: number;
  activeOrders: number;
  expiredCount: number;
  soonExpiringCount: number;
  upcomingRevisions: UpcomingRevision[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Správa bytového domu</h1>
          <p className="text-gray-400 text-sm">Vítejte, {userName}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/svj/new-order" className="px-4 py-2 bg-brand-yellow text-black text-sm font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Objednat revizi
          </Link>
          <Link href="/svj/buildings" className="px-4 py-2 bg-white/5 text-white text-sm font-medium rounded-lg hover:bg-white/10 transition-colors flex items-center gap-2 border border-white/10">
            <Building className="w-4 h-4" /> Spravovat budovy
          </Link>
        </div>
      </div>

      {/* Alert banner */}
      {(expiredCount > 0 || soonExpiringCount > 0) && (
        <AnimatedItem delay={0.05}>
          <div className={cn(
            "p-4 rounded-xl border flex items-start gap-4",
            expiredCount > 0 ? "bg-red-500/5 border-red-500/20" : "bg-orange-500/5 border-orange-500/20"
          )}>
            <div className={cn("p-2 rounded-lg", expiredCount > 0 ? "bg-red-500/10" : "bg-orange-500/10")}>
              <Bell className={cn("w-5 h-5", expiredCount > 0 ? "text-red-500" : "text-orange-500")} />
            </div>
            <div className="flex-1">
              {expiredCount > 0 && (
                <p className="text-red-400 font-medium text-sm">
                  {expiredCount} {expiredCount === 1 ? 'revize expirovala' : 'revizí expirovalo'} – objednejte nové co nejdříve!
                </p>
              )}
              {soonExpiringCount > 0 && (
                <p className="text-orange-400 text-sm mt-1">
                  {soonExpiringCount} {soonExpiringCount === 1 ? 'revize brzy vyprší' : 'revizí brzy vyprší'} (do 90 dní).
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Bez platných revizí může být ohrožena bezpečnost společných prostor a hrozí sankce.
              </p>
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Building className="w-4 h-4 text-brand-yellow mb-2" />
            <p className="text-2xl font-bold text-white">{totalBuildings}</p>
            <p className="text-xs text-gray-500">Budov celkem</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.15}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <FileText className="w-4 h-4 text-blue-400 mb-2" />
            <p className="text-2xl font-bold text-white">{totalRevisions}</p>
            <p className="text-xs text-gray-500">Revizí celkem</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <Clock className="w-4 h-4 text-cyan-400 mb-2" />
            <p className="text-2xl font-bold text-white">{activeOrders}</p>
            <p className="text-xs text-gray-500">Aktivní objednávky</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.25}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", soonExpiringCount > 0 ? "border-orange-500/20" : "border-white/5")}>
            <AlertTriangle className={cn("w-4 h-4 mb-2", soonExpiringCount > 0 ? "text-orange-500" : "text-gray-500")} />
            <p className={cn("text-2xl font-bold", soonExpiringCount > 0 ? "text-orange-500" : "text-white")}>{soonExpiringCount}</p>
            <p className="text-xs text-gray-500">Brzy vyprší</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.3}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", expiredCount > 0 ? "border-red-500/20" : "border-white/5")}>
            <XCircle className={cn("w-4 h-4 mb-2", expiredCount > 0 ? "text-red-500" : "text-gray-500")} />
            <p className={cn("text-2xl font-bold", expiredCount > 0 ? "text-red-500" : "text-white")}>{expiredCount}</p>
            <p className="text-xs text-gray-500">Expirované</p>
          </div>
        </AnimatedItem>
      </div>

      {/* Revision watchdog */}
      {upcomingRevisions.length > 0 && (
        <AnimatedItem delay={0.35}>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand-yellow" /> Hlídač revizí
              </h2>
              <Link href="/svj/revisions" className="text-sm text-brand-yellow hover:underline flex items-center gap-1">
                Všechny revize <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingRevisions.slice(0, 6).map((item, idx) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={cn(
                    "bg-[#1A1A1A] border rounded-xl p-4 transition-all hover:shadow-lg cursor-pointer",
                    item.status === 'expired' ? "border-red-500/30 hover:border-red-500/50" :
                    item.status === 'warning' ? "border-orange-500/30 hover:border-orange-500/50" :
                    item.status === 'soon' ? "border-yellow-500/20 hover:border-yellow-500/40" :
                    "border-white/5 hover:border-brand-yellow/30"
                  )}
                  onClick={() => router.push(`/svj/buildings/${item.buildingId}`)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full",
                        item.status === 'expired' ? "bg-red-500" :
                        item.status === 'warning' ? "bg-orange-500 animate-pulse" :
                        item.status === 'soon' ? "bg-yellow-500" : "bg-green-500"
                      )} />
                      <span className="text-white font-medium text-sm">{item.serviceType}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mb-1 truncate">
                    <Building className="w-3 h-3 inline mr-1" />{item.buildingName}
                  </p>
                  <p className="text-xs text-gray-600 mb-2 truncate">
                    <MapPin className="w-3 h-3 inline mr-1" />{item.address}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <CalendarClock className={cn("w-3.5 h-3.5",
                        item.status === 'expired' ? "text-red-500" :
                        item.status === 'warning' ? "text-orange-500" : "text-gray-500"
                      )} />
                      <span className={cn("text-xs font-medium",
                        item.status === 'expired' ? "text-red-400" :
                        item.status === 'warning' ? "text-orange-400" :
                        item.status === 'soon' ? "text-yellow-400" : "text-gray-400"
                      )}>
                        {item.daysLeft <= 0 ? `Expirováno ${Math.abs(item.daysLeft)}d` :
                         item.daysLeft <= 30 ? `${item.daysLeft} dní!` :
                         `${item.daysLeft} dní`}
                      </span>
                    </div>
                    {(item.status === 'expired' || item.status === 'warning') && (
                      <Link href="/svj/new-order" onClick={(e) => e.stopPropagation()} className={cn("text-[10px] text-white font-bold px-2 py-1 rounded transition-colors",
                        item.status === 'expired' ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
                      )}>
                        OBJEDNAT
                      </Link>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Buildings Grid */}
      <AnimatedItem delay={0.4}>
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-brand-yellow" /> Vaše budovy
            </h2>
            <Link href="/svj/buildings" className="text-sm text-brand-yellow hover:underline flex items-center gap-1">
              Spravovat <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {buildings.length === 0 ? (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-12 text-center">
              <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Žádné budovy</h3>
              <p className="text-gray-500 mb-6">Přidejte svůj první bytový dům a začněte spravovat jeho revize.</p>
              <Link href="/svj/buildings" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
                <Plus className="w-5 h-5" /> Přidat budovu
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map((b: any, idx: number) => {
                const cfg = HEALTH_CONFIG[b.health as keyof typeof HEALTH_CONFIG];
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                  >
                    <Link href={`/svj/buildings/${b.id}`} className="block group">
                      <div className={cn("bg-[#1A1A1A] border rounded-xl p-5 transition-all hover:shadow-lg", cfg.border, "hover:border-brand-yellow/30")}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={cn("w-3 h-3 rounded-full shrink-0", cfg.dot)} />
                            <h3 className="text-sm font-semibold text-white group-hover:text-brand-yellow transition-colors truncate">{b.name}</h3>
                          </div>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", `${cfg.bg}/10`, cfg.text)}>{cfg.label}</span>
                        </div>

                        {b.address && (
                          <p className="text-xs text-gray-500 mb-3 truncate"><MapPin className="w-3 h-3 inline mr-1" />{b.address}</p>
                        )}

                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-[#111] rounded-lg p-2">
                            <p className="text-sm font-bold text-white">{b.completedOrders}</p>
                            <p className="text-[10px] text-gray-500">Revizí</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2">
                            <p className="text-sm font-bold text-white">{b.activeOrders}</p>
                            <p className="text-[10px] text-gray-500">Aktivní</p>
                          </div>
                          <div className="bg-[#111] rounded-lg p-2">
                            <p className={cn("text-sm font-bold", b.expiredCount > 0 ? "text-red-500" : "text-green-500")}>{b.expiredCount}</p>
                            <p className="text-[10px] text-gray-500">Expirováno</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </AnimatedItem>

      {/* Empty state */}
      {buildings.length === 0 && upcomingRevisions.length === 0 && (
        <AnimatedItem delay={0.2}>
          <div className="bg-gradient-to-br from-rose-500/10 to-rose-500/5 border border-rose-500/20 rounded-2xl p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-brand-yellow mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Začněte s Revizone pro SVJ</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Přidejte bytový dům, nastavte revize a systém za vás bude hlídat termíny.
              Nikdy vám neunikne platnost revize a váš dům bude vždy v bezpečí.
            </p>
            <Link href="/svj/buildings" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors">
              <Plus className="w-5 h-5" /> Přidat první budovu
            </Link>
          </div>
        </AnimatedItem>
      )}
    </div>
  );
}
