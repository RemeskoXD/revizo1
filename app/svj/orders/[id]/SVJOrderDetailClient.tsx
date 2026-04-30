'use client';

import {
  ArrowLeft, Calendar, MapPin, Clock, FileText, Building, User,
  CheckCircle2, AlertCircle, Download, ShieldCheck, AlertTriangle, XCircle
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
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Technik</h3>
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
    </div>
  );
}
