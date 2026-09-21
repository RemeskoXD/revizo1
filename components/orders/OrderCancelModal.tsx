'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  LifeBuoy, 
  ArrowRight,
  ShieldCheck,
  Clock
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export interface OrderToCancel {
  id?: string;
  readableId: string;
  serviceType?: string;
  status: string;
  technicianId?: string | null;
  technician?: { id: string; name?: string | null } | null;
  address?: string;
}

interface OrderCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: OrderToCancel | null;
  isAdmin?: boolean;
  onSuccess?: () => void;
}

const PRESET_REASONS = [
  'Již nepotřebuji',
  'Změna plánů / termínu',
  'Objednáno omylem',
  'Vyřešeno svépomocí',
];

export function OrderCancelModal({
  isOpen,
  onClose,
  order,
  isAdmin = false,
  onSuccess,
}: OrderCancelModalProps) {
  const router = useRouter();
  const [reason, setReason] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    requiresSupport?: boolean;
    ticketId?: string;
    message?: string;
  } | null>(null);

  if (!isOpen || !order) return null;

  const hasTechnicianAssigned = !isAdmin && Boolean(
    order.technicianId || 
    order.technician?.id || 
    order.status === 'IN_PROGRESS' || 
    order.status === 'SCHEDULED'
  );

  const handleSelectTag = (tag: string) => {
    if (selectedTag === tag) {
      setSelectedTag(null);
      if (reason === tag) setReason('');
    } else {
      setSelectedTag(tag);
      setReason(tag);
    }
  };

  const handleCancelSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const finalReason = reason.trim() || selectedTag || (
        hasTechnicianAssigned 
          ? 'Zákazník požádal o storno zakázky po převzetí technikem.' 
          : 'Zrušeno zákazníkem v aplikaci.'
      );

      const res = await fetch(`/api/orders/${order.readableId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Nepodařilo se zrušit objednávku. Zkuste to prosím znovu.');
      } else {
        setSuccessData({
          requiresSupport: data.requiresSupport,
          ticketId: data.ticketId,
          message: data.message,
        });

        if (!data.requiresSupport) {
          // Instant direct cancel: refresh after short delay
          setTimeout(() => {
            onClose();
            if (onSuccess) {
              onSuccess();
            } else {
              router.refresh();
            }
          }, 1600);
        }
      }
    } catch {
      setError('Chyba komunikace se serverem. Zkontrolujte připojení k internetu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        {/* Backdrop blur - Apple style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#161616] p-6 shadow-2xl z-10"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-white/10 hover:text-white active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>

          {successData ? (
            /* SUCCESS STATE */
            <div className="py-4 text-center space-y-4 animate-in fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              {successData.requiresSupport ? (
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-white">Žádost o storno byla odeslána</h3>
                  <p className="text-sm text-gray-300 max-w-md mx-auto leading-relaxed">
                    K zakázce je již přiřazen technik. Vytvořili jsme tiket na zákaznickou podporu, která stav ověří u technika a bude vás neprodleně kontaktovat.
                  </p>
                  {successData.ticketId && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-400 font-mono inline-block">
                      ID tiketu podpory: #{successData.ticketId.slice(-6).toUpperCase()}
                    </div>
                  )}
                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <Link
                      href="/dashboard/support"
                      className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-black transition-all hover:bg-brand-yellow-hover active:scale-95"
                    >
                      Přejít na podporu
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onSuccess) onSuccess();
                        else router.refresh();
                      }}
                      className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-gray-300 hover:bg-white/5 active:scale-95"
                    >
                      Zavřít
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Objednávka byla zrušena</h3>
                  <p className="text-sm text-gray-400">
                    Objednávka #{order.readableId} byla úspěšně stornována bez poplatku.
                  </p>
                  <div className="inline-flex items-center gap-2 text-xs text-emerald-400 pt-2">
                    <ShieldCheck className="w-4 h-4" />
                    Zrušení proběhlo okamžitě
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* FORM STATE */
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start gap-3.5">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
                  hasTechnicianAssigned
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                  {hasTechnicianAssigned ? (
                    <LifeBuoy className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                </div>
                <div className="min-w-0 pr-6">
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {hasTechnicianAssigned ? 'Storno zakázky u technika' : 'Zrušit objednávku'}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 mt-0.5">
                    Zakázka #{order.readableId} {order.serviceType ? `• ${order.serviceType}` : ''}
                  </p>
                </div>
              </div>

              {/* Status Explanation Card */}
              {isAdmin ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-xs text-red-300">
                  Jako administrátor můžete tuto zakázku okamžitě zrušit na 1 kliknutí.
                </div>
              ) : hasTechnicianAssigned ? (
                <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <Clock className="w-4 h-4" />
                    Technik si již zakázku převzal
                  </div>
                  <p className="text-xs text-amber-200/90 leading-relaxed">
                    Technik má pro tuto revizi rezervovaný termín. Kliknutím na tlačítko níže automaticky <strong>vytvoříme tiket na naši zákaznickou podporu</strong>, která storno obratem dořeší a potvrdí vám výsledek.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    Technik si zakázku ještě nepřevzal
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed">
                    Můžete ji <strong>jednoduše zrušit ihned na 1 kliknutí</strong>. Žádné storno poplatky se neúčtují.
                  </p>
                </div>
              )}

              {/* Optional Quick Reason Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {hasTechnicianAssigned ? 'Důvod pro podporu (nepovinné)' : 'Důvod zrušení (nepovinné)'}
                </label>

                <div className="flex flex-wrap gap-2">
                  {PRESET_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectTag(preset)}
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                        selectedTag === preset
                          ? 'bg-white text-black font-semibold'
                          : 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    if (selectedTag && e.target.value !== selectedTag) {
                      setSelectedTag(null);
                    }
                  }}
                  placeholder={
                    hasTechnicianAssigned
                      ? 'Napište nám podrobnosti (např. potřeba jiného termínu, oprava hotova)...'
                      : 'Můžete upřesnit důvod...'
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#111] p-3 text-sm text-white placeholder-gray-500 focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons - Apple Style 44px+ Touch Targets */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={onClose}
                  className="w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-300 hover:bg-white/5 disabled:opacity-50 active:scale-95 transition-all"
                >
                  Ponechat objednávku
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCancelSubmit}
                  className={`w-full sm:w-auto inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
                    hasTechnicianAssigned
                      ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/10'
                      : 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/10'
                  }`}
                >
                  {isSubmitting ? (
                    <span>Zpracovávám...</span>
                  ) : hasTechnicianAssigned ? (
                    <>
                      <LifeBuoy className="w-4 h-4" />
                      <span>Vytvořit tiket na podporu</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Zrušit objednávku</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
