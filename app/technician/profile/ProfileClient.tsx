'use client';

import { useState } from 'react';
import { User, Mail, Phone, Building, Save, ShieldCheck, AlertTriangle } from 'lucide-react';
import { isRevisionAuthExpired } from '@/lib/revision-auth-core';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function ProfileClient({ user }: { user: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name || '',
    phone: user.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    // Split name into firstName and lastName for the API
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, phone: formData.phone }),
      });
      
      if (res.ok) {
        setIsEditing(false);
        router.refresh();
      } else {
        alert('Došlo k chybě při ukládání profilu.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při ukládání profilu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Můj profil</h1>
        <p className="text-gray-400 mt-1">Spravujte své osobní údaje a nastavení účtu.</p>
      </div>

      <div
        className={`rounded-xl border p-4 sm:p-5 ${
          user.revisionAuthValidUntil == null
            ? 'border-amber-500/30 bg-amber-500/5'
            : isRevisionAuthExpired('TECHNICIAN', user.revisionAuthValidUntil)
              ? 'border-red-500/40 bg-red-500/10'
              : 'border-emerald-500/25 bg-emerald-500/5'
        }`}
      >
        <div className="flex items-start gap-3">
          {user.revisionAuthValidUntil != null && isRevisionAuthExpired('TECHNICIAN', user.revisionAuthValidUntil) ? (
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
            ) : isRevisionAuthExpired('TECHNICIAN', user.revisionAuthValidUntil) ? (
              <p className="mt-1 text-sm text-red-200">
                Platnost vypršela {new Date(user.revisionAuthValidUntil).toLocaleDateString('cs-CZ')}. Obnovte oprávnění u
                administrátora.
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

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="w-16 h-16 bg-brand-yellow/10 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-brand-yellow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name || 'Neznámý uživatel'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck className="w-4 h-4 text-brand-yellow" />
              <span className="text-sm text-brand-yellow font-medium">Technik</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Jméno a příjmení</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Emailová adresa</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="email"
                    disabled
                    value={user.email || ''}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white opacity-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500">Email nelze změnit.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Telefonní číslo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Přiřazená firma</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="w-5 h-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={user.company?.name || 'Žádná (Nezávislý technik)'}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white opacity-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end gap-3">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({ name: user.name || '', phone: user.phone || '' });
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                  >
                    Zrušit
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-brand-yellow text-black text-sm font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Ukládám...' : 'Uložit změny'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
                >
                  Upravit profil
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Join Company Section */}
      {!user.company && (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden mt-6">
          <div className="p-6 border-b border-white/5">
            <h2 className="text-xl font-bold text-white">Připojit se k firmě</h2>
            <p className="text-gray-400 mt-1">Zadejte kód firmy pro připojení k jejímu týmu.</p>
          </div>
          <div className="p-6">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const code = (e.target as any).inviteCode.value;
              if (!code) return;
              
              try {
                const res = await fetch('/api/technician/join-company', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inviteCode: code }),
                });
                const data = await res.json();
                if (res.ok) {
                  alert('Žádost o připojení byla úspěšně odeslána. Nyní musíte počkat na schválení firmou.');
                  (e.target as any).reset();
                } else {
                  alert(data.error || 'Došlo k chybě při odesílání žádosti.');
                }
              } catch (error) {
                alert('Došlo k chybě při odesílání žádosti.');
              }
            }} className="flex gap-4">
              <input
                type="text"
                name="inviteCode"
                placeholder="Zadejte kód firmy"
                required
                className="flex-1 px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-colors"
              >
                Odeslat žádost
              </button>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
}
