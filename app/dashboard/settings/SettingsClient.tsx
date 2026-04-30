'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { User as UserIcon, Lock, Bell, Save, UserX, X, ShieldCheck, AlertTriangle, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { User } from '@prisma/client';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { isRevisionAuthExpired, isRevisionAuthRole } from '@/lib/revision-auth-core';

const DISABLED_TABS = new Set(['security', 'notifications']);

export default function SettingsClient({
  user,
  stripeConfigured,
  stripeFakeMode = false,
}: {
  user: User;
  /** true pokud Stripe klíče + cena, nebo zapnutý FAKE_PAYMENT_GATEWAY */
  stripeConfigured: boolean;
  /** true = testovací brána /platba-test místo Stripe */
  stripeFakeMode?: boolean;
}) {
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState<'checkout' | 'portal' | null>(null);
  
  const [firstName, setFirstName] = useState(user.name?.split(' ')[0] || '');
  const [lastName, setLastName] = useState(user.name?.split(' ').slice(1).join(' ') || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [emailNotifs, setEmailNotifs] = useState((user as any).emailNotifications !== false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteNote, setDeleteNote] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const router = useRouter();
  const pathname = usePathname() || '/dashboard/settings';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const q = new URLSearchParams(window.location.search);
    if (q.get('tab') === 'billing') setActiveTab('billing');
    const st = q.get('stripe');
    if (st === 'success') {
      alert(
        'Platba proběhla. Platnost licence se doplní z webhooku během několika vteřin – obnovte stránku, pokud se datum nezmění.'
      );
      router.replace(`${pathname}?tab=billing`);
      router.refresh();
    } else if (st === 'cancel') {
      alert('Platba byla zrušena.');
      router.replace(`${pathname}?tab=billing`);
    }
  }, [router, pathname]);

  const startCheckout = useCallback(async () => {
    setStripeLoading('checkout');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      alert((data as { message?: string }).message || 'Nepodařilo se otevřít platbu.');
    } finally {
      setStripeLoading(null);
    }
  }, [pathname]);

  const openPortal = async () => {
    setStripeLoading('portal');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnPath: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url as string;
        return;
      }
      alert((data as { message?: string }).message || 'Portál se nepodařilo otevřít.');
    } finally {
      setStripeLoading(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone, emailNotifications: emailNotifs }),
      });
      
      if (res.ok) {
        alert('Změny byly úspěšně uloženy.');
        router.refresh();
      } else {
        alert('Došlo k chybě při ukládání změn.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při ukládání změn.');
    } finally {
      setIsLoading(false);
    }
  };

  const openDeleteRequestModal = () => {
    if (
      !window.confirm(
        'Opravdu chcete podat žádost o trvalé smazání účtu? Žádost bude odeslána ke schválení správcem.'
      )
    ) {
      return;
    }
    setDeleteError(null);
    setDeletePassword('');
    setDeleteNote('');
    setShowDeleteModal(true);
  };

  const handleDeleteRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletePassword.trim()) {
      setDeleteError('Zadejte heslo.');
      return;
    }
    setDeleteSubmitting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/user/account-deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          note: deleteNote.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowDeleteModal(false);
        setDeletePassword('');
        setDeleteNote('');
        alert(data.message || 'Žádost byla odeslána ke schválení.');
        router.refresh();
      } else {
        setDeleteError(data.message || 'Žádost se nepodařilo odeslat.');
      }
    } catch {
      setDeleteError('Došlo k chybě při odesílání žádosti.');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Nastavení účtu</h1>
        <p className="text-gray-400">Spravujte své osobní údaje a preference.</p>
      </div>

      {isRevisionAuthRole(user.role) && (
        <div
          className={`rounded-xl border p-4 sm:p-5 ${
            user.revisionAuthValidUntil == null
              ? 'border-amber-500/30 bg-amber-500/5'
              : isRevisionAuthExpired(user.role, user.revisionAuthValidUntil)
                ? 'border-red-500/40 bg-red-500/10'
                : 'border-emerald-500/25 bg-emerald-500/5'
          }`}
        >
          <div className="flex items-start gap-3">
            {user.revisionAuthValidUntil != null && isRevisionAuthExpired(user.role, user.revisionAuthValidUntil) ? (
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            ) : (
              <ShieldCheck className="h-5 w-5 shrink-0 text-brand-yellow" />
            )}
            <div>
              <h2 className="font-semibold text-white">Oprávnění k provádění revizí</h2>
              {user.revisionAuthValidUntil == null ? (
                <p className="mt-1 text-sm text-amber-200/90">
                  Platnost oprávnění zatím není v systému nastavena. Kontaktujte administrátora Revizone.
                </p>
              ) : isRevisionAuthExpired(user.role, user.revisionAuthValidUntil) ? (
                <p className="mt-1 text-sm text-red-200">
                  Platnost vypršela{' '}
                  {new Date(user.revisionAuthValidUntil).toLocaleDateString('cs-CZ')}. Obnovte oprávnění u administrátora.
                </p>
              ) : (
                <p className="mt-1 text-sm text-gray-300">
                  Platné do{' '}
                  <span className="font-medium text-emerald-300">
                    {new Date(user.revisionAuthValidUntil).toLocaleDateString('cs-CZ')}
                  </span>{' '}
                  (včetně uvedeného dne).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Navigation */}
        <div className="w-full md:w-64 flex-shrink-0 space-y-1">
          {[
            { id: 'profile', label: 'Osobní údaje', icon: UserIcon },
            { id: 'billing', label: 'Platby / licence', icon: CreditCard },
            { id: 'security', label: 'Zabezpečení', icon: Lock },
            { id: 'notifications', label: 'Upozornění', icon: Bell },
          ].map((item) => {
            const disabled = DISABLED_TABS.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (!disabled) setActiveTab(item.id);
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors text-left',
                  disabled
                    ? 'cursor-not-allowed opacity-40 text-gray-500'
                    : activeTab === item.id
                      ? 'bg-brand-yellow text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                )}
                title={disabled ? 'Sekce bude brzy k dispozici' : undefined}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {disabled && <span className="text-[10px] uppercase tracking-wide text-gray-600">brzy</span>}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#1A1A1A] border border-white/5 rounded-xl p-6 md:p-8 overflow-hidden relative min-h-[400px]">
          <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
              <motion.form 
                key="settings-form-profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSave}
              >
              {/* Profile Tab */}
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="flex items-center gap-4 mb-6 opacity-40 pointer-events-none select-none">
                      <div className="w-20 h-20 rounded-full bg-[#111] border border-white/10 flex items-center justify-center">
                          <UserIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                          <p className="text-sm text-gray-500">Profilová fotka</p>
                          <p className="text-xs text-gray-600 mt-1">Již brzy</p>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Jméno</label>
                          <input 
                            type="text" 
                            value={firstName} 
                            onChange={(e) => setFirstName(e.target.value)}
                            className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Příjmení</label>
                          <input 
                            type="text" 
                            value={lastName} 
                            onChange={(e) => setLastName(e.target.value)}
                            className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">E-mail</label>
                          <input 
                            type="email" 
                            defaultValue={user.email || ''} 
                            disabled
                            className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-gray-500 cursor-not-allowed outline-none" 
                          />
                      </div>
                      <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-400">Telefon</label>
                          <input 
                            type="tel" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none" 
                          />
                      </div>
                  </div>

                  <div className="space-y-2 opacity-40 pointer-events-none select-none">
                      <label className="text-sm font-medium text-gray-400">Fakturační adresa</label>
                      <input type="text" defaultValue="" disabled placeholder="Již brzy" className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-gray-500 cursor-not-allowed outline-none" />
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3">E-mailová upozornění</h4>
                    <label className="flex items-center justify-between p-4 bg-[#111] border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-white">Upozornění na expiraci revizí</p>
                        <p className="text-xs text-gray-500 mt-1">E-maily 30, 14, 7, 2 a 1 den před vypršením platnosti revize</p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={emailNotifs}
                          onChange={(e) => setEmailNotifs(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-brand-yellow transition-colors" />
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 border-t border-emerald-500/25">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      Spravovat své předplatné
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Faktury, platební metodu a předplatné (změna, zrušení) spravuje přímo{' '}
                      <strong className="text-gray-400">Stripe</strong> na jejich obecné stránce pro zákazníky (Billing
                      Portal) – stejná, jakou používají tisíce e‑shopů.
                    </p>
                    {!stripeConfigured ? (
                      <p className="text-xs text-amber-200/85">
                        Online platby nejsou na tomto prostředí aktivní. Po nasazení Stripe zde bude odkaz do portálu.
                      </p>
                    ) : user.stripeCustomerId || stripeFakeMode ? (
                      <button
                        type="button"
                        onClick={openPortal}
                        disabled={stripeLoading !== null}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        {stripeLoading === 'portal' ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        {stripeFakeMode ? 'Otevřít testovací portál' : 'Otevřít správu předplatného ve Stripe'}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-gray-500">
                          Po dokončení první platby přes Revizone se zde objeví tlačítko do Stripe portálu. Mezitím můžete
                          předplatné založit v sekci Platby / licence.
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <button
                            type="button"
                            onClick={startCheckout}
                            disabled={stripeLoading !== null}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
                          >
                            {stripeLoading === 'checkout' ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CreditCard className="h-4 w-4" />
                            )}
                            Zahájit předplatné
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('billing')}
                            className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/5"
                          >
                            Platby / licence…
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-red-500/20">
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                      <UserX className="w-4 h-4 text-red-400" />
                      Smazání účtu
                    </h4>
                    <p className="text-xs text-gray-500 mb-4">
                      Požádáte o trvalé smazání účtu. Z bezpečnostních důvodů zadáte heslo; žádost projde schválením v
                      administraci. Podrobnosti a alternativní postup najdete na{' '}
                      <Link href="/smazatucet" className="text-brand-yellow hover:underline" target="_blank" rel="noopener noreferrer">
                        stránce smazání účtu
                      </Link>
                      .
                    </p>
                    <button
                      type="button"
                      onClick={openDeleteRequestModal}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-red-500/40 text-red-400 text-sm font-medium hover:bg-red-500/10 transition-colors"
                    >
                      Požádat o smazání účtu
                    </button>
                  </div>

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                  <button 
                      type="submit" 
                      disabled={isLoading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors shadow-lg shadow-brand-yellow/10 disabled:opacity-50"
                  >
                      {isLoading ? (
                          <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                      ) : (
                          <Save className="w-5 h-5" />
                      )}
                      <span>Uložit změny</span>
                  </button>
              </div>
              </div>
            </motion.form>
              )}

              {activeTab === 'billing' && (
                <motion.div
                  key="settings-billing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-white">Platby a licence Revizone</h2>
                    <p className="mt-1 text-sm text-gray-400">
                      {stripeFakeMode
                        ? 'Testovací režim: místo Stripe se zobrazí falešná brána s tlačítkem Pokračovat. Licence v DB se nemění, dokud neproběhne skutečná platba / webhook.'
                        : 'Předplatné přes Stripe. Po úspěšné platbě se platnost licence doplní automaticky (webhook).'}
                    </p>
                  </div>

                  {stripeFakeMode && (
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-amber-100">
                      Zapnuto <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">FAKE_PAYMENT_GATEWAY</code> – jen
                      pro vývoj nebo demo. Na produkci vypněte.
                    </div>
                  )}

                  {!stripeConfigured ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-100">
                      Online platby nejsou na tomto prostředí nastavené. Po nasazení doplňte proměnné{' '}
                      <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">STRIPE_SECRET_KEY</code> a{' '}
                      <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">STRIPE_PRICE_ID</code>
                      (a webhook <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">STRIPE_WEBHOOK_SECRET</code>).
                    </div>
                  ) : (
                    <>
                      <div className="rounded-lg border border-white/10 bg-[#111] p-4 space-y-2">
                        <p className="text-sm text-gray-400">Stav licence (aplikační)</p>
                        <p className="text-white font-medium">
                          {user.licenseValidUntil
                            ? `Platné do ${new Date(user.licenseValidUntil).toLocaleString('cs-CZ')}`
                            : 'Zatím bez aktivní licence z předplatného'}
                        </p>
                        {user.lastStripePaymentAt && (
                          <p className="text-xs text-gray-500">
                            Poslední záznam platby: {new Date(user.lastStripePaymentAt).toLocaleString('cs-CZ')}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={startCheckout}
                          disabled={stripeLoading !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-yellow px-5 py-2.5 text-sm font-semibold text-black hover:bg-brand-yellow-hover disabled:opacity-50"
                        >
                          {stripeLoading === 'checkout' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CreditCard className="h-4 w-4" />
                          )}
                          Předplatit / změnit plán
                        </button>
                        <button
                          type="button"
                          onClick={openPortal}
                          disabled={stripeLoading !== null || (!user.stripeCustomerId && !stripeFakeMode)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/5 disabled:opacity-40"
                          title={
                            !user.stripeCustomerId && !stripeFakeMode
                              ? 'Nejdřív dokončete první platbu přes Stripe.'
                              : undefined
                          }
                        >
                          {stripeLoading === 'portal' ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : null}
                          {stripeFakeMode ? 'Testovací portál (falešný)' : 'Faktury a platební metoda (Stripe)'}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </div>

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-[#1A1A1A] p-6 shadow-xl">
            <button
              type="button"
              onClick={() => !deleteSubmitting && setShowDeleteModal(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white"
              aria-label="Zavřít"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 id="delete-account-title" className="text-lg font-semibold text-white pr-8">
              Potvrzení žádosti o smazání účtu
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Pro ověření identity zadejte heslo k účtu. Žádost bude odeslána ke schválení.
            </p>
            <form onSubmit={handleDeleteRequestSubmit} className="mt-6 space-y-4">
              {deleteError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                  {deleteError}
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Heslo</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-white/10 bg-[#111] px-3 py-2.5 text-white focus:border-brand-yellow outline-none"
                  disabled={deleteSubmitting}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-400">Poznámka (volitelné)</label>
                <textarea
                  value={deleteNote}
                  onChange={(e) => setDeleteNote(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-white/10 bg-[#111] px-3 py-2.5 text-white focus:border-brand-yellow outline-none"
                  disabled={deleteSubmitting}
                  placeholder="Např. důvod žádosti…"
                />
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3 pt-2">
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={() => setShowDeleteModal(false)}
                  className="rounded-lg border border-white/15 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 disabled:opacity-50"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={deleteSubmitting}
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  {deleteSubmitting ? 'Odesílám…' : 'Odeslat žádost'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
