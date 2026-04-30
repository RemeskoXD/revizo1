'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  FileText, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Send, 
  Paperclip,
  Download,
  User,
  ShieldCheck,
  Building,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Order } from '@prisma/client';
import { ChatSection } from '@/components/ChatSection';
import { ReviewSection } from '@/components/ReviewSection';
import { PhotoSection } from '@/components/PhotoSection';
import { getTipsForService } from '@/lib/preparationTips';

export default function OrderDetailClient({ order, currentUser, technicians = [] }: { order: Order, currentUser: any, technicians?: any[] }) {
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const router = useRouter();

  const handleAssign = async () => {
    if (!selectedTechId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/company/orders/${order.readableId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: selectedTechId }),
      });
      if (res.ok) {
        alert('Technik byl úspěšně přiřazen.');
        router.refresh();
      } else {
        alert('Došlo k chybě při přiřazování technika.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při přiřazování technika.');
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col space-y-6">
      {/* Header */}
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex items-start gap-3 sm:items-center">
          <Link href="/dashboard/orders" className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl font-bold text-white sm:text-2xl">Objednávka #{order.readableId}</h1>
            <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                order.status === 'COMPLETED' ? "bg-green-500/10 text-green-500 border-green-500/20" : 
                order.status === 'IN_PROGRESS' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                order.status === 'NEEDS_REVISION' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                order.status === 'CANCELLED' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
            )}>
              {order.status === 'COMPLETED' ? 'Dokončeno' :
               order.status === 'IN_PROGRESS' ? 'Probíhá' :
               order.status === 'NEEDS_REVISION' ? 'K přepracování' :
               order.status === 'CANCELLED' ? 'Zrušeno' : 'Čeká'}
            </span>
          </div>
          <p className="text-sm text-gray-400">Vytvořeno {new Date(order.createdAt).toLocaleDateString('cs-CZ')}</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
            {['ADMIN', 'SUPPORT', 'CONTRACTOR'].includes(currentUser.role) && (
              <select
                value={order.status}
                onChange={async (e) => {
                  const newStatus = e.target.value;
                  try {
                    const res = await fetch(`/api/admin/orders/${order.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: newStatus }),
                    });
                    if (res.ok) {
                      router.refresh();
                    } else {
                      alert('Chyba při změně stavu');
                    }
                  } catch (error) {
                    console.error(error);
                    alert('Chyba při změně stavu');
                  }
                }}
                className="bg-[#1A1A1A] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-brand-yellow outline-none"
              >
                <option value="PENDING">Nová</option>
                <option value="IN_PROGRESS">Probíhá</option>
                <option value="NEEDS_REVISION">K přepracování</option>
                <option value="COMPLETED">Dokončeno</option>
                <option value="CANCELLED">Zrušeno</option>
              </select>
            )}
            
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Left Column: Details & Timeline */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6 overflow-y-auto pr-2">
          
          {/* Preparation Tips - only show before completion */}
          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (() => {
            const tips = getTipsForService(order.serviceType);
            if (tips.length === 0) return null;
            return (
              <div className="bg-brand-yellow/5 border border-brand-yellow/20 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-5 h-5 text-brand-yellow" />
                  <h3 className="text-sm font-bold text-brand-yellow">Co si nachystat před revizí</h3>
                </div>
                <ul className="space-y-2">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-brand-yellow mt-0.5">•</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {/* Status Timeline */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Průběh revize</h3>
            <div className="relative">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10"></div>
                <div className="space-y-8 relative">
                    {[
                        { status: 'Objednáno', date: new Date(order.createdAt).toLocaleString('cs-CZ'), active: true, completed: true },
                        { status: 'Přiřazen technik', date: order.technicianId ? 'Ano' : '-', active: !!order.technicianId, completed: !!order.technicianId, desc: order.technicianId ? 'Technik přiřazen' : '' },
                        { 
                          status: 'Naplánováno', 
                          date: (order as any).scheduledDate ? new Date((order as any).scheduledDate).toLocaleString('cs-CZ') : '-', 
                          active: !!(order as any).scheduledDate, 
                          completed: !!(order as any).scheduledDate, 
                          current: !!(order as any).scheduledDate && order.status === 'IN_PROGRESS',
                          desc: (order as any).scheduledNote || ((order as any).confirmedAddress && (order as any).confirmedAddress !== order.address ? `Adresa upřesněna: ${(order as any).confirmedAddress}` : '')
                        },
                        { 
                          status: 'Revize provedena', 
                          date: (order as any).completedAt ? new Date((order as any).completedAt).toLocaleString('cs-CZ') : '-', 
                          active: order.status === 'COMPLETED', 
                          completed: order.status === 'COMPLETED',
                          desc: (order as any).revisionResult === 'PASS' ? 'Bez závad' : (order as any).revisionResult === 'PASS_WITH_NOTES' ? 'S výhradami' : (order as any).revisionResult === 'FAIL' ? 'Nevyhovuje' : ''
                        },
                        { 
                          status: 'Zpráva vystavena', 
                          date: order.reportFile ? 'Dostupná ke stažení' : '-', 
                          active: !!order.reportFile, 
                          completed: !!order.reportFile 
                        },
                    ].map((step, i) => (
                        <div key={i} className="flex gap-4">
                            <div className={cn(
                                "relative z-10 w-6 h-6 rounded-full flex items-center justify-center border-2 flex-shrink-0 bg-[#1A1A1A]",
                                step.completed ? "border-brand-yellow bg-brand-yellow text-black" :
                                step.current ? "border-brand-yellow text-brand-yellow animate-pulse" :
                                "border-gray-700 text-gray-700"
                            )}>
                                {step.completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                                {step.current && <Clock className="w-3.5 h-3.5" />}
                            </div>
                            <div className={cn("pt-0.5", !step.active && "opacity-50")}>
                                <p className={cn("font-medium", step.current ? "text-brand-yellow" : "text-white")}>{step.status}</p>
                                <p className="text-xs text-gray-500">{step.date}</p>
                                {step.desc && <p className="text-sm text-gray-400 mt-1 bg-white/5 p-2 rounded border border-white/5">{step.desc}</p>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Detaily objednávky</h3>
              {currentUser.role === 'COMPANY_ADMIN' && order.status === 'PENDING' && (
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedTechId}
                    onChange={(e) => setSelectedTechId(e.target.value)}
                    className="bg-[#111] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-brand-yellow outline-none"
                  >
                    <option value="">Přiřadit technika...</option>
                    {technicians.map((tech: any) => (
                      <option key={tech.id} value={tech.id}>{tech.name || tech.email}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAssign}
                    disabled={isAssigning || !selectedTechId}
                    className="px-4 py-1.5 bg-brand-yellow text-black text-sm font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
                  >
                    {isAssigning ? '...' : 'Přiřadit'}
                  </button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Typ služby</p>
                            <p className="text-white font-medium">{order.serviceType}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Adresa</p>
                            <p className="text-white font-medium">{order.address}</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Zákazník ID</p>
                            <p className="text-white font-medium">{order.customerId}</p>
                        </div>
                    </div>
                    {/* @ts-ignore */}
                    {order.technician && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-brand-yellow/10 rounded-lg text-brand-yellow">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Přiřazený technik</p>
                            {/* @ts-ignore */}
                            <p className="text-white font-medium">{order.technician.name || order.technician.email}</p>
                            {/* @ts-ignore */}
                            {order.technician.phone && <p className="text-xs text-gray-400">{order.technician.phone}</p>}
                        </div>
                      </div>
                    )}
                    {/* @ts-ignore */}
                    {!order.technician && order.company && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-brand-yellow/10 rounded-lg text-brand-yellow">
                            <Building className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Přiřazená firma</p>
                            {/* @ts-ignore */}
                            <p className="text-white font-medium">{order.company.name || order.company.email}</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/5 rounded-lg text-gray-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Poznámka</p>
                            <p className="text-white text-sm">{order.notes || 'Bez poznámky'}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          {/* Technician Info - Scheduling & Result */}
          {((order as any).scheduledDate || (order as any).revisionNotes || (order as any).nextRevisionDate) && (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-4">
              <h3 className="text-lg font-semibold text-white">Informace od technika</h3>
              {(order as any).scheduledDate && (
                <div className="flex items-center gap-3 p-3 bg-[#111] rounded-lg border border-white/5">
                  <Calendar className="w-5 h-5 text-brand-yellow shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Potvrzený termín</p>
                    <p className="text-white font-medium">{new Date((order as any).scheduledDate).toLocaleString('cs-CZ')}</p>
                  </div>
                </div>
              )}
              {(order as any).scheduledNote && (
                <div className="p-3 bg-[#111] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Poznámka technika k termínu:</p>
                  <p className="text-sm text-gray-300">{(order as any).scheduledNote}</p>
                </div>
              )}
              {(order as any).revisionNotes && (
                <div className="p-3 bg-[#111] rounded-lg border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Poznámky z revize:</p>
                  <p className="text-sm text-gray-300">{(order as any).revisionNotes}</p>
                </div>
              )}
              {(order as any).nextRevisionDate && (
                <div className="flex items-center gap-3 p-3 bg-brand-yellow/5 rounded-lg border border-brand-yellow/20">
                  <ShieldCheck className="w-5 h-5 text-brand-yellow shrink-0" />
                  <div>
                    <p className="text-xs text-gray-500">Další plánovaná revize</p>
                    <p className="text-brand-yellow font-medium">{new Date((order as any).nextRevisionDate).toLocaleDateString('cs-CZ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Documents (if any) */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Dokumenty</h3>
            {/* @ts-ignore */}
            {order.reportFile ? (
              <div className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[#111] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-lg bg-brand-yellow/10 p-2 text-brand-yellow">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-white">Revizní zpráva</p>
                    <p className="text-xs text-gray-500">PDF Dokument</p>
                  </div>
                </div>
                <a 
                  href={`/api/orders/${order.readableId}/download`} 
                  download 
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:self-center"
                >
                  <Download className="h-4 w-4" /> Stáhnout
                </a>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 border border-dashed border-white/10 rounded-lg text-gray-500">
                  <p>Zatím nebyly nahrány žádné dokumenty.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat + Review */}
        <div className="flex w-full flex-col gap-6 lg:w-1/3 lg:min-h-0">
            <div className="flex h-[min(420px,65dvh)] max-h-[640px] min-h-[280px] flex-col lg:h-[480px]">
            <ChatSection orderId={order.id} currentUserId={currentUser.id} />
            </div>
            <PhotoSection orderId={order.id} isTechnician={false} />
            <ReviewSection 
              orderReadableId={order.readableId} 
              isCustomer={order.customerId === currentUser.id}
              orderStatus={order.status}
              hasTechnician={!!order.technicianId}
            />
        </div>
      </div>
    </div>
  );
}
