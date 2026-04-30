'use client';

import { useState } from 'react';
import { 
  AlertTriangle, CheckCircle2, Clock, ArrowRight, ShieldCheck, 
  PlusCircle, Bell, FileText, Share2, XCircle, ChevronRight,
  CalendarClock, Eye
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { AnimatedItem } from '@/components/AnimatedItem';
import { cn } from '@/lib/utils';

interface WatchdogItem {
  id: string;
  readableId: string;
  serviceType: string;
  address: string;
  completedAt: string;
  expiresAt: string;
  daysLeft: number;
  categoryName: string | null;
  result: string | null;
  hasReport: boolean;
  status: 'expired' | 'warning' | 'soon' | 'ok';
}

export default function DashboardClient({ 
  user, recentOrders, activeOrdersCount, completedOrdersCount, watchdogItems, defectTasks 
}: any) {
  const router = useRouter();
  const [isSharing, setIsSharing] = useState(false);

  const expiredCount = watchdogItems.filter((w: WatchdogItem) => w.status === 'expired').length;
  const warningCount = watchdogItems.filter((w: WatchdogItem) => w.status === 'warning').length;
  const openTasksCount = defectTasks.length;

  const handleShareAll = async () => {
    const completedIds = watchdogItems.filter((w: WatchdogItem) => w.hasReport).map((w: WatchdogItem) => w.id);
    if (completedIds.length === 0) { alert('Žádné revize ke sdílení.'); return; }
    
    setIsSharing(true);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: completedIds, label: `Revize – ${user.name || user.email}`, expiresInDays: 30 }),
      });
      const data = await res.json();
      if (res.ok) {
        const fullUrl = `${window.location.origin}${data.url}`;
        await navigator.clipboard.writeText(fullUrl);
        alert(`Odkaz zkopírován do schránky!\n\n${fullUrl}\n\nPlatný 30 dní.`);
      }
    } catch { alert('Chyba při vytváření odkazu.'); }
    finally { setIsSharing(false); }
  };

  const handleResolveTask = async (taskId: string) => {
    try {
      await fetch('/api/user/defect-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, status: 'RESOLVED' }),
      });
      router.refresh();
    } catch { alert('Chyba.'); }
  };

  return (
    <div className="space-y-8">
      {/* Welcome + Quick Actions */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-white sm:text-2xl">Vítejte, {user.name?.split(' ')[0] || 'uživateli'} 👋</h1>
          <p className="mt-1 text-sm text-gray-400 sm:text-base">Váš přehled revizí a termínů.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
          <button type="button" onClick={handleShareAll} disabled={isSharing} className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-50">
            <Share2 className="h-4 w-4 shrink-0" /> {isSharing ? 'Generuji...' : 'Sdílet revize'}
          </button>
          <Link href="/dashboard/new-order" className="flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover">
            <PlusCircle className="h-4 w-4 shrink-0" /> Nová objednávka
          </Link>
        </div>
      </div>

      {/* Alerts Banner */}
      {(expiredCount > 0 || openTasksCount > 0) && (
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
                  {expiredCount} {expiredCount === 1 ? 'revize expirovala' : 'revizí expirovalo'} – objednejte novou co nejdříve!
                </p>
              )}
              {warningCount > 0 && (
                <p className="text-orange-400 font-medium text-sm">
                  {warningCount} {warningCount === 1 ? 'revize brzy vyprší' : 'revizí brzy vyprší'} (do 90 dní)
                </p>
              )}
              {openTasksCount > 0 && (
                <p className="text-orange-400 text-sm mt-1">
                  Máte {openTasksCount} {openTasksCount === 1 ? 'nevyřešený úkol' : 'nevyřešené úkoly'} ze zjištěných závad.
                </p>
              )}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <AnimatedItem delay={0.1}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-4 h-4 text-brand-yellow" />
              <span className="text-xs text-gray-500 uppercase font-semibold">Aktivní</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeOrdersCount}</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.15}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 uppercase font-semibold">Dokončeno</span>
            </div>
            <p className="text-2xl font-bold text-white">{completedOrdersCount}</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.2}>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500 uppercase font-semibold">Platné</span>
            </div>
            <p className="text-2xl font-bold text-white">{watchdogItems.filter((w: WatchdogItem) => w.status === 'ok' || w.status === 'soon').length}</p>
          </div>
        </AnimatedItem>
        <AnimatedItem delay={0.25}>
          <div className={cn("bg-[#1A1A1A] border rounded-xl p-4", expiredCount > 0 ? "border-red-500/20" : "border-white/5")}>
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className={cn("w-4 h-4", expiredCount > 0 ? "text-red-500" : "text-gray-500")} />
              <span className="text-xs text-gray-500 uppercase font-semibold">Expirované</span>
            </div>
            <p className={cn("text-2xl font-bold", expiredCount > 0 ? "text-red-500" : "text-white")}>{expiredCount}</p>
          </div>
        </AnimatedItem>
      </div>

      {/* Watchdog - Hlídací pes */}
      {watchdogItems.length > 0 && (
        <AnimatedItem delay={0.3}>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-5 h-5 text-brand-yellow" /> Hlídací pes revizí
              </h2>
              <Link href="/dashboard/vault" className="text-sm text-brand-yellow hover:underline flex items-center gap-1">
                Trezor <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchdogItems.slice(0, 6).map((item: WatchdogItem, idx: number) => (
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
                  onClick={() => router.push(`/dashboard/orders/${item.readableId}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2.5 h-2.5 rounded-full", 
                        item.status === 'expired' ? "bg-red-500" :
                        item.status === 'warning' ? "bg-orange-500 animate-pulse" :
                        item.status === 'soon' ? "bg-yellow-500" : "bg-green-500"
                      )} />
                      <span className="text-white font-medium text-sm">{item.serviceType}</span>
                    </div>
                    {item.result && (
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        item.result === 'PASS' ? "bg-green-500/10 text-green-500" :
                        item.result === 'FAIL' ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"
                      )}>
                        {item.result === 'PASS' ? '✓' : item.result === 'FAIL' ? '✗' : '!'}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2 truncate">{item.address}</p>
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
                    {item.status === 'expired' && (
                      <Link href="/dashboard/new-order" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-red-500 text-white font-bold px-2 py-1 rounded hover:bg-red-600 transition-colors">
                        OBJEDNAT
                      </Link>
                    )}
                    {item.status === 'warning' && (
                      <Link href="/dashboard/new-order" onClick={(e) => e.stopPropagation()} className="text-[10px] bg-orange-500 text-white font-bold px-2 py-1 rounded hover:bg-orange-600 transition-colors">
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

      {/* Defect Tasks - Úkoly ze závad */}
      {defectTasks.length > 0 && (
        <AnimatedItem delay={0.4}>
          <div className="bg-[#1A1A1A] border border-orange-500/20 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-500" /> Úkoly ze zjištěných závad
            </h2>
            <div className="space-y-3">
              {defectTasks.map((task: any) => (
                <div key={task.id} className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border transition-colors",
                  task.priority === 'HIGH' ? "bg-red-500/5 border-red-500/20" : "bg-[#111] border-white/5"
                )}>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{task.title}</p>
                    {task.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{task.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-gray-500">#{task.order.readableId}</span>
                      <span className="text-[10px] text-gray-500">{task.order.address}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link href={`/dashboard/orders/${task.order.readableId}`} className="text-xs text-brand-yellow hover:underline">Detail</Link>
                    <button onClick={() => handleResolveTask(task.id)} className="text-xs px-3 py-1.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors font-medium">
                      Vyřešeno ✓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AnimatedItem>
      )}

      {/* Recent Orders */}
      <AnimatedItem delay={0.5}>
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white">Nedávné objednávky</h2>
            <Link href="/dashboard/orders" className="text-sm text-brand-yellow hover:underline flex items-center gap-1">
              Zobrazit vše <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
            {recentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <FileText className="w-8 h-8 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Zatím nemáte žádné objednávky.</p>
                <Link href="/dashboard/new-order" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-brand-yellow text-black font-semibold rounded-lg text-sm hover:bg-brand-yellow-hover transition-colors">
                  <PlusCircle className="w-4 h-4" /> Objednat první revizi
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentOrders.map((order: any) => (
                  <Link key={order.id} href={`/dashboard/orders/${order.readableId}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.02] transition-colors">
                    <div className={cn("w-2 h-2 rounded-full shrink-0",
                      order.status === 'COMPLETED' ? "bg-green-500" :
                      order.status === 'IN_PROGRESS' ? "bg-blue-500" :
                      order.status === 'CANCELLED' ? "bg-red-500" : "bg-yellow-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{order.serviceType}</span>
                        <span className="text-[10px] text-gray-500 font-mono">#{order.readableId}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{order.address}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={cn("text-xs font-medium",
                        order.status === 'COMPLETED' ? "text-green-500" :
                        order.status === 'IN_PROGRESS' ? "text-blue-500" : "text-yellow-500"
                      )}>
                        {order.status === 'COMPLETED' ? 'Dokončeno' : order.status === 'IN_PROGRESS' ? 'Probíhá' : order.status === 'CANCELLED' ? 'Zrušeno' : 'Čeká'}
                      </span>
                      <p className="text-[10px] text-gray-600">{new Date(order.createdAt).toLocaleDateString('cs-CZ')}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </AnimatedItem>

      {/* Empty state - no revisions yet */}
      {watchdogItems.length === 0 && recentOrders.length === 0 && (
        <AnimatedItem delay={0.2}>
          <div className="bg-gradient-to-br from-brand-yellow/10 to-brand-yellow/5 border border-brand-yellow/20 rounded-2xl p-8 text-center">
            <ShieldCheck className="w-12 h-12 text-brand-yellow mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Začněte s Revizone</h2>
            <p className="text-gray-400 max-w-md mx-auto mb-6">
              Objednejte si první revizi nebo nahrajte starou revizní zprávu. 
              Systém za vás bude hlídat termíny a upozorní vás, než platnost vyprší.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/dashboard/new-order" className="px-6 py-3 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors flex items-center gap-2">
                <PlusCircle className="w-5 h-5" /> Objednat revizi
              </Link>
            </div>
          </div>
        </AnimatedItem>
      )}
    </div>
  );
}
