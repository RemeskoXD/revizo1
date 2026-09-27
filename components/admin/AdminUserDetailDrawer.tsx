'use client';

import { useState, useEffect } from 'react';
import { 
  X, 
  User as UserIcon, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  Shield, 
  ShieldCheck, 
  Calendar, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Loader2, 
  DollarSign, 
  Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';
import { toast } from 'react-hot-toast';

export interface AdminUserRecord {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  ico: string | null;
  bankAccount: string | null;
  role: string;
  priority: number;
  companyId: string | null;
  createdAt: string | Date;
  bannedAt: string | Date | null;
  emailVerified: string | Date | null;
  isDeleted?: boolean;
  revisionAuthValidUntil?: string | Date | null;
  creditBalance?: number | null;
  objectLimitBase?: number | null;
  objectLimitExtraPaid?: number | null;
  objectPackagePaid?: boolean | null;
  objectLimitOverride?: number | null;
  company?: { id: string; name: string | null; email: string | null } | null;
  authorizedCategories?: { id: string; name: string; group?: string }[];
}

interface AdminUserDetailDrawerProps {
  isOpen: boolean;
  user: AdminUserRecord | null;
  companies: { id: string; label: string }[];
  revisionCategories: { id: string; name: string; group?: string }[];
  userRole: string;
  currentUserId: string;
  onClose: () => void;
  onUpdate: (updatedUser: AdminUserRecord) => void;
  onDelete?: (userId: string) => void;
}

export function AdminUserDetailDrawer({
  isOpen,
  user,
  companies,
  revisionCategories,
  userRole,
  currentUserId,
  onClose,
  onUpdate,
  onDelete,
}: AdminUserDetailDrawerProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [ico, setIco] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [priority, setPriority] = useState(1);
  const [companyId, setCompanyId] = useState('');
  const [revisionAuthValidUntil, setRevisionAuthValidUntil] = useState('');
  const [creditBalance, setCreditBalance] = useState<string>('0');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [objectLimitOverride, setObjectLimitOverride] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions' | 'limits'>('profile');

  const [isSaving, setIsSaving] = useState(false);
  const [isBanning, setIsBanning] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
      setIco(user.ico || '');
      setBankAccount(user.bankAccount || '');
      setRole(user.role || 'CUSTOMER');
      setPriority(user.priority || 1);
      setCompanyId(user.companyId || '');
      setRevisionAuthValidUntil(
        user.revisionAuthValidUntil
          ? new Date(user.revisionAuthValidUntil).toISOString().slice(0, 10)
          : ''
      );
      setCreditBalance(user.creditBalance != null ? String(user.creditBalance) : '0');
      setSelectedCategories(user.authorizedCategories?.map((c) => c.id) || []);
      setObjectLimitOverride(
        user.objectLimitOverride != null ? String(user.objectLimitOverride) : ''
      );
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [user]);

  if (!user) return null;

  const isTechOrCompany = ['TECHNICIAN', 'COMPANY_ADMIN'].includes(role);
  const isCustomerOrSVJ = ['CUSTOMER', 'SVJ', 'COMPANY_ADMIN'].includes(role);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payload: Record<string, unknown> = {
        name,
        email,
        phone,
        address,
        ico,
        bankAccount,
        priority: Number(priority),
        companyId: companyId || null,
        revisionAuthValidUntil: revisionAuthValidUntil || null,
        creditBalance: creditBalance.trim() === '' ? 0 : Number(creditBalance),
        authorizedCategoryIds: selectedCategories,
        objectLimitOverride: objectLimitOverride.trim() === '' ? null : Number(objectLimitOverride),
      };

      if (userRole === 'ADMIN') {
        payload.role = role;
      }

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        onUpdate({
          ...user,
          ...updated,
          company: companies.find((c) => c.id === updated.companyId)
            ? { id: updated.companyId, name: companies.find((c) => c.id === updated.companyId)?.label || '', email: null }
            : null,
        });
        toast.success(`Uživatel ${updated.name || updated.email} byl aktualizován.`);
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

  const handleToggleBan = async () => {
    const willBan = !user.bannedAt;
    if (
      !confirm(
        willBan
          ? 'Opravdu chcete tohoto uživatele zablokovat? Bude odhlášen.'
          : 'Opravdu chcete tohoto uživatele odblokovat?'
      )
    )
      return;

    setIsBanning(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: willBan }),
      });

      if (res.ok) {
        const data = await res.json();
        const newBannedAt = data.bannedAt ? new Date(data.bannedAt) : null;
        onUpdate({ ...user, bannedAt: newBannedAt });
        toast.success(willBan ? 'Uživatel byl zablokován (BAN).' : 'Uživatel byl odblokován.');
      } else {
        toast.error('Chyba při změně blokace.');
      }
    } catch {
      toast.error('Chyba při změně blokace.');
    } finally {
      setIsBanning(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!confirm('Opravdu chcete ručně označit e-mail jako ověřený?')) return;

    setIsVerifyingEmail(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/verify-email`, {
        method: 'POST',
      });
      if (res.ok) {
        onUpdate({ ...user, emailVerified: new Date() });
        toast.success('E-mail uživatele byl ověřen.');
      } else {
        toast.error('Chyba při ověřování e-mailu.');
      }
    } catch {
      toast.error('Chyba při ověřování e-mailu.');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Opravdu chcete smazat/deaktivovat uživatele ${user.email}? Tato akce je nevratná.`))
      return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success(`Uživatel ${user.email} byl deaktivován.`);
        if (onDelete) onDelete(user.id);
        onClose();
      } else {
        toast.error('Chyba při mazání uživatele.');
      }
    } catch {
      toast.error('Chyba při mazání uživatele.');
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white font-bold">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-base font-bold text-white">
                      {user.name || 'Uživatel bez jména'}
                    </p>
                    {user.bannedAt && (
                      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-400">
                        BAN
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-gray-400">{user.email}</p>
                </div>
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

            {/* iOS Tabs Segmented Switcher */}
            <div className="shrink-0 border-b border-white/5 bg-[#18181a] px-5 py-2.5 sm:px-6">
              <div className="flex rounded-xl bg-black/40 p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Profil & Kontakt
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                    activeTab === 'permissions'
                      ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Role & Oprávnění
                </button>
                {isCustomerOrSVJ && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('limits')}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      activeTab === 'limits'
                        ? 'bg-white/15 text-white shadow-sm ring-1 ring-white/20'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Objekty & Limity
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6 space-y-5">
              {/* Feedback messages */}
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

              {/* TAB 1: Profile & Contact */}
              {activeTab === 'profile' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-3.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Osobní & firemní údaje
                    </h3>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">
                        Celé jméno / Název
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">Telefon</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">Adresa sídla / bydliště</label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">IČO</label>
                        <input
                          type="text"
                          value={ico}
                          onChange={(e) => setIco(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">Bankovní účet</label>
                        <input
                          type="text"
                          value={bankAccount}
                          onChange={(e) => setBankAccount(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fast Contact Actions */}
                  <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4">
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Rychlá komunikace
                    </h3>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {phone && (
                        <a
                          href={`tel:${phone.replace(/\s+/g, '')}`}
                          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all"
                        >
                          <Phone className="h-4 w-4 text-emerald-400" />
                          Zavolat ({phone})
                        </a>
                      )}
                      {email && (
                        <a
                          href={`mailto:${email}`}
                          className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 active:scale-[0.98] transition-all"
                        >
                          <Mail className="h-4 w-4 text-blue-400" />
                          Napsat e-mail
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Roles, Permissions, Categories */}
              {activeTab === 'permissions' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Role & Firemní vazby
                    </h3>

                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-400">Systémová role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        disabled={userRole !== 'ADMIN'}
                        className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2.5 text-sm text-white focus:border-brand-yellow focus:outline-none disabled:opacity-50"
                      >
                        <option value="CUSTOMER">Zákazník</option>
                        <option value="TECHNICIAN">Revizní technik</option>
                        <option value="COMPANY_ADMIN">Firma (Pracujeme v týmu)</option>
                        <option value="PRODUCT_MANAGER">Produkt Manager (Realitní makléř)</option>
                        <option value="REALTY">Realitní makléř</option>
                        <option value="SVJ">Správce SVJ</option>
                        <option value="ADMIN">Administrátor</option>
                        <option value="SUPPORT">Podpora / Support</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">
                          Přiřazená mateřská firma
                        </label>
                        <select
                          value={companyId}
                          onChange={(e) => setCompanyId(e.target.value)}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        >
                          <option value="">-- Bez firmy (Samostatný) --</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-400">
                          Priorita zobrazování (1-100)
                        </label>
                        <input
                          type="number"
                          value={priority}
                          onChange={(e) => setPriority(Number(e.target.value))}
                          min={1}
                          max={100}
                          className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technician credentials */}
                  {isTechOrCompany && (
                    <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-yellow flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4" />
                        Oprávnění technika & Kredit
                      </h3>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-400">
                            Platnost revizního oprávnění do
                          </label>
                          <input
                            type="date"
                            value={revisionAuthValidUntil}
                            onChange={(e) => setRevisionAuthValidUntil(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-400">
                            Kreditní zůstatek (Kč)
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={creditBalance}
                              onChange={(e) => setCreditBalance(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] py-2 pl-3 pr-8 text-sm text-brand-yellow font-bold focus:border-brand-yellow focus:outline-none"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                              Kč
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Authorized Categories Pills */}
                      <div>
                        <label className="mb-2 block text-xs font-medium text-gray-400">
                          Oprávněné kategorie revizí
                        </label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {revisionCategories.map((cat) => {
                            const isSelected = selectedCategories.includes(cat.id);
                            return (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => toggleCategory(cat.id)}
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all ${
                                  isSelected
                                    ? 'border-brand-yellow/50 bg-brand-yellow/10 text-white font-medium'
                                    : 'border-white/5 bg-[#2a2a2c] text-gray-400 hover:text-white'
                                }`}
                              >
                                <div
                                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                    isSelected
                                      ? 'border-brand-yellow bg-brand-yellow text-black'
                                      : 'border-white/20 bg-transparent'
                                  }`}
                                >
                                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                                </div>
                                <span className="truncate">{cat.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Limits & Buildings */}
              {activeTab === 'limits' && isCustomerOrSVJ && (
                <div className="rounded-2xl border border-white/10 bg-[#1c1c1e] p-4 space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-blue-400" />
                    Kapacita a limity nemovitostí
                  </h3>
                  <p className="text-xs text-gray-400">
                    Nastavení maximálního počtu spravovaných objektů pro SVJ a firemní účty.
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-400">
                      Vlastní override limitu objektů (ponechte prázdné pro výchozí dle tarifu)
                    </label>
                    <input
                      type="number"
                      value={objectLimitOverride}
                      onChange={(e) => setObjectLimitOverride(e.target.value)}
                      placeholder="Automaticky dle balíčku"
                      className="w-full rounded-xl border border-white/10 bg-[#2a2a2c] px-3 py-2 text-sm text-white focus:border-brand-yellow focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions Footer */}
            <div className="shrink-0 border-t border-white/10 bg-[#18181a] p-4 sm:px-6">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  {userRole === 'ADMIN' && user.id !== currentUserId && (
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
                  {user.id !== currentUserId && (
                    <button
                      type="button"
                      disabled={isBanning}
                      onClick={handleToggleBan}
                      className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold active:scale-[0.98] transition-all ${
                        user.bannedAt
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                      }`}
                    >
                      {isBanning ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Ban className="h-4 w-4" />
                      )}
                      {user.bannedAt ? 'Odblokovat' : 'Blokovat (BAN)'}
                    </button>
                  )}
                  {user.emailVerified === null && (
                    <button
                      type="button"
                      disabled={isVerifyingEmail}
                      onClick={handleVerifyEmail}
                      className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 active:scale-[0.98] transition-all"
                    >
                      {isVerifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Ověřit e-mail
                    </button>
                  )}
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
