'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  DollarSign, 
  ShieldCheck, 
  Building, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ExternalLink, 
  Trash2, 
  Copy, 
  Check, 
  Loader2,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';

export interface AdminOrderRecord {
  id: string;
  readableId: string;
  serviceType: string;
  propertyType: string;
  address: string;
  confirmedAddress?: string | null;
  notes?: string | null;
  status: string;
  price?: number | null;
  createdAt: string | Date;
  scheduledDate?: string | Date | null;
  preferredDate?: string | Date | null;
  isVerifiedAdmin?: boolean;
  isPaid?: boolean;
  isUrgent?: boolean;
  technicianId?: string | null;
  companyId?: string | null;
  customerId: string;
  customer?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  technician?: { id: string; name?: string | null; email?: string | null; phone?: string | null } | null;
  company?: { id: string; name?: string | null; email?: string | null } | null;
  reportFile?: string | null;
  invoiceFile?: string | null;
}

interface AdminOrderDetailDrawerProps {
  isOpen: boolean;
  order: AdminOrderRecord | null;
  technicians: { id: string; name?: string | null; email?: string | null }[];
  companies: { id: string; name?: string | null; email?: string | null }[];
  userRole: string;
  onClose: () => void;
  onUpdate: (updatedOrder: AdminOrderRecord) => void;
  onDelete?: (orderId: string) => void;
}

export function AdminOrderDetailDrawer({
  isOpen,
  order,
  technicians,
  companies,
  userRole,
  onClose,
  onUpdate,
  onDelete,
}: AdminOrderDetailDrawerProps) {
  const [status, setStatus] = useState('PENDING');
  const [technicianId, setTechnicianId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [price, setPrice] = useState<string>('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (order) {
      setStatus(order.status || 'PENDING');
      setTechnicianId(order.technicianId || '');
      setCompanyId(order.companyId || '');
      setPrice(order.price != null ? String(order.price) : '');
      setAddress(order.address || '');
      setNotes(order.notes || '');
      setScheduledDate(
        order.scheduledDate ? new Date(order.scheduledDate).toISOString().slice(0, 10) : ''
      );
      setIsVerifiedAdmin(Boolean(order.isVerifiedAdmin));
      setIsPaid(Boolean(order.isPaid));
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [order]);

  if (!order) return null;

  const handleCopyId = () => {
    navigator.clipboard.writeText(`#${order.readableId}`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          technicianId: technicianId || null,
          companyId: companyId || null,
          price: price.trim() === '' ? null : Number(price),
          address,
          notes,
          scheduledDate: scheduledDate || null,
          isVerifiedAdmin,
          isPaid,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdate({
          ...order,
          ...updated,
          technician: technicians.find(t => t.id === updated.technicianId) || null,
          company: companies.find(c => c.id === updated.companyId) || null,
        });
        toast.success(`Změny u zakázky #${order.readableId} uloženy.`);
      } else {
        const err = await res.json().catch(() => ({}));
        const msg = err.message || 'Nepodařilo se uložit změny.';
        setErrorMsg(msg);
        toast.error(msg);
      }
    } catch {
      setErrorMsg('Chyba při komunikaci se serverem.');
      toast.error('Chyba při komunikaci se serverem.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!confirm(`Opravdu chcete stornovat zakázku #${order.readableId}? Zákazník i technik obdrží notifikaci o zrušení.`)) return;

    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });

      if (res.ok) {
        setStatus('CANCELLED');
        onUpdate({ ...order, status: 'CANCELLED' });
        toast.success(`Zakázka #${order.readableId} byla stornována.`);
      } else {
        toast.error('Došlo k chybě při stornování zakázky.');
      }
    } catch {
      toast.error('Došlo k chybě při stornování zakázky.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Opravdu chcete smazat objednávku #${order.readableId}? Tato akce je nevratná.`)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Zakázka #${order.readableId} smazána.`);
        if (onDelete) onDelete(order.id);
        onClose();
      } else {
        toast.error('Chyba při mazání objednávky.');
      }
    } catch {
      toast.error('Chyba při mazání objednávky.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Slide-over panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-white/10 bg-[#141414] shadow-2xl pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]"
          >
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCopyId}
                  title="Kopírovat ID zakázky"
                  className="group flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-sm font-bold font-mono text-brand-yellow hover:bg-white/10"
                >
                  #{order.readableId}
                  {copiedId ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400 group-hover:text-white" />}
                </button>
                <span className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString('cs-CZ')}
                </span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-white/10 hover:text-white"
                aria-label="Zavřít panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
              {/* Feedback banners */}
              {errorMsg && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Status Segmented Selector (iOS style) */}
              <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 shadow-sm">
                <label className="mb-2.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Stav zakázky
                </label>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5 p-1 bg-black/40 rounded-xl border border-white/5">
                  {[
                    { id: 'PENDING', label: 'Nová', color: 'text-amber-400' },
                    { id: 'IN_PROGRESS', label: 'Probíhá', color: 'text-blue-400' },
                    { id: 'NEEDS_REVISION', label: 'Výhrady', color: 'text-orange-400' },
                    { id: 'COMPLETED', label: 'Hotovo', color: 'text-emerald-400' },
                    { id: 'CANCELLED', label: 'Storno', color: 'text-red-400' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStatus(s.id)}
                      className={`flex min-h-[38px] items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                        status === s.id
                          ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className={status === s.id ? s.color : ''}>{s.label}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-3.5 flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-gray-300">Schváleno administrátorem</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isVerifiedAdmin}
                      onChange={(e) => setIsVerifiedAdmin(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-white/10 peer-checked:bg-emerald-500 after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              </div>

              {/* Assignment & Execution */}
              <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Přiřazení a realizace
                </h3>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Přiřazený revizní technik
                  </label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2.5 text-sm text-white focus:border-brand-yellow focus:outline-none"
                  >
                    <option value="">-- Bez technika (Nepřiřazeno) --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name || t.email} {t.name && t.email ? `(${t.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Firma / dodavatel
                  </label>
                  <select
                    value={companyId}
                    onChange={(e) => setCompanyId(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2.5 text-sm text-white focus:border-brand-yellow focus:outline-none"
                  >
                    <option value="">-- Bez firmy --</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || c.email}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Cena zakázky (Kč)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="např. 2500"
                        className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] py-2 pl-3 pr-8 text-sm text-brand-yellow font-bold focus:border-brand-yellow focus:outline-none"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                        Kč
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">
                      Termín provedení
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-3">
                  <span className="text-xs text-gray-300">Zakázka byla uhrazena</span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={isPaid}
                      onChange={(e) => setIsPaid(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-white/10 peer-checked:bg-brand-yellow peer-checked:after:bg-black after:absolute after:top-[2px] after:left-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                </div>
              </div>

              {/* Order Info & Address */}
              <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Informace o revizi & místo
                </h3>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-black/30 p-3">
                    <span className="text-gray-500 block mb-1">Typ služby</span>
                    <span className="font-semibold text-white">{order.serviceType}</span>
                  </div>
                  <div className="rounded-xl bg-black/30 p-3">
                    <span className="text-gray-500 block mb-1">Objekt</span>
                    <span className="font-semibold text-white">{order.propertyType || 'Neuvedeno'}</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-gray-400">Adresa objektu</label>
                    {address && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-brand-yellow hover:underline flex items-center gap-1"
                      >
                        <MapPin className="h-3 w-3" /> Mapy →
                      </a>
                    )}
                  </div>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">
                    Poznámky k zakázce
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Poznámka od zákazníka nebo interní pokyny..."
                    className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] p-3 text-sm text-white placeholder-gray-500 focus:border-brand-yellow focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer Contact Card with 44px+ iOS Buttons */}
              <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Kontakt na zákazníka
                </h3>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-bold">
                    {(order.customer?.name || order.customer?.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-white truncate">
                      {order.customer?.name || 'Neznámý zákazník'}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{order.customer?.email || 'Bez e-mailu'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {order.customer?.phone && (
                    <a
                      href={`tel:${order.customer.phone.replace(/\s+/g, '')}`}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all"
                    >
                      <Phone className="h-4 w-4 text-emerald-400" />
                      Zavolat ({order.customer.phone})
                    </a>
                  )}
                  {order.customer?.email && (
                    <a
                      href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Revizone – Zakázka #${order.readableId}`)}`}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all"
                    >
                      <Mail className="h-4 w-4 text-blue-400" />
                      Napsat e-mail
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Actions Footer */}
            <div className="shrink-0 border-t border-white/10 bg-[#18181a] p-4 sm:px-6">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {userRole === 'ADMIN' && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 active:scale-[0.98] transition-all"
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Smazat
                    </button>
                  )}
                  {status !== 'CANCELLED' && (
                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleCancelOrder}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 active:scale-[0.98] transition-all"
                    >
                      {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      Stornovat
                    </button>
                  )}
                  <a
                    href={`/dashboard/orders/${order.readableId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-all"
                    title="Otevřít veřejný náhled"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Náhled
                  </a>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSave}
                  className="flex min-h-[44px] flex-1 sm:flex-none sm:min-w-[140px] items-center justify-center gap-2 rounded-xl bg-brand-yellow px-5 py-2.5 text-sm font-bold text-black shadow-lg shadow-brand-yellow/20 hover:bg-brand-yellow-hover active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ukládám...
                    </>
                  ) : (
                    'Uložit změny'
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
