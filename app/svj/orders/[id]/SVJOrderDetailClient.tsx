'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Calendar, MapPin, Clock, FileText, Building, User,
  CheckCircle2, AlertCircle, Download, ShieldCheck, AlertTriangle, XCircle, X
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  readableId: string;
  serviceType: string;
  propertyType: string;
  status: string;
  address: string;
  notes: string | null;
  price: number | null;
  revisionResult: string | null;
  revisionNotes: string | null;
  scheduledDate: string | null;
  scheduledNote: string | null;
  preferredDate: string | null;
  completedAt: string | null;
  createdAt: string;
  hasReport: boolean;
  propertyId: string | null;
  propertyName: string;
  technician: { id: string; name: string | null; email: string | null } | null;
  company: { id: string; name: string | null; email: string | null } | null;
  categoryName: string | null;
  intervalMonths: number | null;
};

export default function SVJOrderDetailClient({ order }: { order: Order }) {
  const router = useRouter();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const hasTechnicianAssigned = Boolean(order.technician?.id || order.status === 'IN_PROGRESS');
  const canCancel = !['COMPLETED', 'CANCELLED'].includes(order.status);

  const handleCancelOrder = async () => {
    if (hasTechnicianAssigned && cancelReason.trim().length < 5) {
      setCancelError('Uveďte prosím důvod storna (alespoň 5 znaků).');
      return;
    }
    setIsSubmittingCancel(true);
    setCancelError(null);
    setCancelMessage(null);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelError(data.message || 'Chyba při zpracování storna.');
      } else {
        setCancelMessage(data.message);
        setTimeout(() => {
          setIsCancelModalOpen(false);
          router.refresh();
        }, 2200);
      }
    } catch (e) {
      setCancelError('Chyba komunikace se serverem.');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const resultConfig = {
    PASS: { label: 'Bez závad', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: ShieldCheck },
    PASS_WITH_NOTES: { label: 'S výhradami', color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: AlertTriangle },
    FAIL: { label: 'Nevyhovělo', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: XCircle },
  };

  const result = order.revisionResult ? resultConfig[order.revisionResult as keyof typeof resultConfig] : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6 sm:p-8">
        <div className="flex items-start gap-6">
          <Link href={order.propertyId ? `/svj/buildings/${order.propertyId}` : '/svj/buildings'} className="shrink-0 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors border border-white/10 group mt-1">
            <ArrowLeft className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <div className="w-10 h-10 rounded-lg bg-brand-yellow/10 flex items-center justify-center border border-brand-yellow/20">
                <FileText className="w-5 h-5 text-brand-yellow" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{order.serviceType}</h1>
              <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold",
                order.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                order.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                order.status === 'CANCELLED' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                'bg-brand-yellow/10 text-brand-yellow border border-brand-yellow/20'
              )}>
                {order.status === 'COMPLETED' ? 'Dokončeno' :
                 order.status === 'IN_PROGRESS' ? 'Probíhá' :
                 order.status === 'CANCELLED' ? 'Zrušeno' : 'Čeká na vyřízení'}
              </span>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelError(null);
                    setCancelMessage(null);
                    setIsCancelModalOpen(true);
                  }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 active:scale-95 ml-auto"
                >
                  Stornovat objednávku
                </button>
              )}
            </div>
            <p className="text-gray-400 font-mono text-sm mb-4">#{order.readableId}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Building className="w-4 h-4 text-gray-500" />
                {order.propertyName}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-500" />
                {order.address}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-gray-500" />
                {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Revision result */}
          {result && (
            <div className={cn("border rounded-2xl p-6", result.bg, result.border)}>
              <div className="flex items-center gap-3 mb-3">
                <result.icon className={cn("w-6 h-6", result.color)} />
                <h2 className={cn("text-lg font-bold", result.color)}>Výsledek: {result.label}</h2>
              </div>
              {order.revisionNotes && (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{order.revisionNotes}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-400" />
              Poznámky
            </h2>
            {order.notes ? (
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{order.notes}</p>
            ) : (
              <p className="text-gray-500 italic">Žádné poznámky.</p>
            )}
          </div>

          {/* Report download */}
          {order.hasReport && (
            <div className="bg-[#1A1A1A] border border-green-500/20 rounded-2xl p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Revizní zpráva
              </h2>
              <a
                href={`/api/orders/${order.id}/download`}
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-500/10 hover:bg-green-500/20 text-green-400 font-medium rounded-xl transition-colors border border-green-500/20"
              >
                <Download className="w-5 h-5" />
                Stáhnout revizní zprávu (PDF)
              </a>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Building info */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Budova</h3>
            <Link href={`/svj/buildings/${order.propertyId}`} className="group flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center border border-rose-500/20 group-hover:bg-brand-yellow/10 group-hover:border-brand-yellow/20 transition-colors shrink-0">
                <Building className="w-5 h-5 text-rose-400 group-hover:text-brand-yellow transition-colors" />
              </div>
              <div>
                <p className="text-white font-medium group-hover:text-brand-yellow transition-colors">{order.propertyName}</p>
                <p className="text-sm text-gray-500 mt-0.5">{order.address}</p>
              </div>
            </Link>
          </div>

          {/* Technician */}
          {order.technician && (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Revizní technik</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <User className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-white font-medium">{order.technician.name || 'Neznámý'}</p>
                  <p className="text-sm text-gray-500">{order.technician.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Timing */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Termíny</h3>
            <div className="space-y-4">
              {order.scheduledDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Naplánováno</p>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-brand-yellow" />
                    {new Date(order.scheduledDate).toLocaleDateString('cs-CZ')}
                  </div>
                  {order.scheduledNote && (
                    <p className="text-xs text-gray-500 mt-1">{order.scheduledNote}</p>
                  )}
                </div>
              )}
              {order.preferredDate && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Preferovaný termín</p>
                  <div className="flex items-center gap-2 text-white">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    {new Date(order.preferredDate).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
              )}
              {order.completedAt && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Dokončeno</p>
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    {new Date(order.completedAt).toLocaleDateString('cs-CZ')}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 mb-1">Vytvořeno</p>
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {new Date(order.createdAt).toLocaleString('cs-CZ')}
                </div>
              </div>
            </div>
          </div>

          {/* Price */}
          {order.price !== null && (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Cena</h3>
              <p className="text-2xl font-bold text-white">{order.price.toLocaleString('cs-CZ')} Kč</p>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Stornovat objednávku #{order.readableId}</h3>
                <p className="text-xs text-gray-400">
                  {hasTechnicianAssigned ? 'Žádost o storno s přiřazeným technikem' : 'Okamžité storno bez poplatku'}
                </p>
              </div>
            </div>

            {cancelMessage ? (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
                {cancelMessage}
              </div>
            ) : (
              <div className="space-y-4">
                {hasTechnicianAssigned ? (
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-300">
                    K této zakázce je již přiřazen technik. Váš požadavek bude předán zákaznické podpoře, která ověří stav u technika a kontaktuje vás.
                  </div>
                ) : (
                  <p className="text-sm text-gray-300">
                    Opravdu si přejete tuto objednávku stornovat? K zakázce zatím nebyl přiřazen technik, storno proběhne okamžitě a bez poplatku.
                  </p>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Důvod storna {hasTechnicianAssigned ? '*' : '(nepovinné)'}
                  </label>
                  <textarea
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder={hasTechnicianAssigned ? 'Uveďte prosím důvod pro zákaznickou podporu (např. změna termínu, oprava již proběhla)...' : 'Můžete nám napsat důvod zrušení...'}
                    className="w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white placeholder-gray-500 focus:border-brand-yellow focus:outline-none"
                  />
                </div>

                {cancelError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {cancelError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isSubmittingCancel}
                    onClick={() => setIsCancelModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-50"
                  >
                    Zpět
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingCancel}
                    onClick={handleCancelOrder}
                    className="rounded-xl bg-red-500 hover:bg-red-600 px-4 py-2.5 text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmittingCancel
                      ? 'Odesílám...'
                      : hasTechnicianAssigned
                      ? 'Odeslat žádost o storno'
                      : 'Potvrdit storno'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
