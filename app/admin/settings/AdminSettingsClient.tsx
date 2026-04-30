'use client';

import { useState } from 'react';
import { Save, Settings, Shield, Mail, User, Link as LinkIcon, Check, X, Copy, Users, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsClient({ user, teamMembers, systemConfig = {} }: { user: any, teamMembers: any[], systemConfig?: Record<string, string> }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // System config state
  const [configValues, setConfigValues] = useState({
    public_timeout_hours: systemConfig['public_timeout_hours'] || '24',
    global_banner: systemConfig['global_banner'] || '',
    global_banner_type: systemConfig['global_banner_type'] || 'info',
    default_revision_months: systemConfig['default_revision_months'] || '36',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configValues),
      });
      if (res.ok) alert('Nastavení platformy uloženo.');
      else alert('Chyba při ukládání.');
    } catch { alert('Chyba.'); }
    finally { setIsSavingConfig(false); }
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const router = useRouter();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
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
        alert('Nastavení bylo úspěšně uloženo.');
        router.refresh();
      } else {
        alert('Došlo k chybě při ukládání nastavení.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při ukládání nastavení.');
    } finally {
      setIsSaving(false);
    }
  };

  const generateInviteLink = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/admin/settings/generate-code', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/registertest?invite=${data.inviteCode}`;
        setInviteLink(link);
      } else {
        alert('Nepodařilo se vygenerovat odkaz.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApproveClick = (memberId: string) => {
    setSelectedMemberId(memberId);
    setShowPasswordModal(true);
    setPassword('');
  };

  const confirmApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !password) return;

    setIsApproving(true);
    try {
      const res = await fetch(`/api/admin/team/${selectedMemberId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        alert('Člen týmu byl úspěšně schválen.');
        setShowPasswordModal(false);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Nesprávné heslo nebo chyba při schvalování.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Opravdu chcete deaktivovat člena "${memberName}"? Tato akce je nevratná.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${memberId}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Člen týmu byl deaktivován.');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || 'Chyba při odstraňování.');
      }
    } catch {
      alert('Došlo k chybě.');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPPORT':
        return <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-bold rounded-md">Podpora</span>;
      case 'CONTRACTOR':
        return <span className="px-2 py-1 bg-purple-500/10 text-purple-500 text-xs font-bold rounded-md">Zhotovitel</span>;
      case 'PENDING_SUPPORT':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-md flex items-center gap-1"><Clock className="w-3 h-3" /> Čeká na schválení (Podpora)</span>;
      case 'PENDING_CONTRACTOR':
        return <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded-md flex items-center gap-1"><Clock className="w-3 h-3" /> Čeká na schválení (Zhotovitel)</span>;
      default:
        return <span className="px-2 py-1 bg-gray-500/10 text-gray-500 text-xs font-bold rounded-md">{role}</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-2xl font-bold text-white">Nastavení administrátora</h1>
        <p className="text-gray-400 mt-1">Správa vašeho profilu a globálních nastavení systému.</p>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Administrátor'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-red-500 font-medium">Hlavní administrátor</span>
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
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none transition-colors"
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
                    value={formData.email}
                    className="w-full pl-10 pr-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white opacity-50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500">Email nelze změnit.</p>
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2 bg-brand-yellow text-black text-sm font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Ukládám...' : 'Uložit nastavení'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Platform Control Panel */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Řízení platformy</h2>
            <p className="text-sm text-gray-400">Globální nastavení systému bez nutnosti nového nasazení.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Doba do zveřejnění zakázky (hodiny)</label>
              <input type="number" min="1" max="168" value={configValues.public_timeout_hours} onChange={(e) => setConfigValues({ ...configValues, public_timeout_hours: e.target.value })} className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none" />
              <p className="text-xs text-gray-500">Nepřiřazená zakázka spadne do veřejné fronty po tomto čase.</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Výchozí platnost revize (měsíce)</label>
              <input type="number" min="1" max="120" value={configValues.default_revision_months} onChange={(e) => setConfigValues({ ...configValues, default_revision_months: e.target.value })} className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none" />
              <p className="text-xs text-gray-500">Použije se pokud objednávka nemá přiřazenou revizní kategorii.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Globální upozornění (banner pro všechny uživatele)</label>
            <textarea value={configValues.global_banner} onChange={(e) => setConfigValues({ ...configValues, global_banner: e.target.value })} rows={2} placeholder='Např. "V pátek 20.10. bude probíhat údržba systému." Nechte prázdné pro skrytí.' className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none resize-none" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Typ banneru</label>
            <div className="flex gap-3">
              {[
                { value: 'info', label: 'Informace', color: 'border-blue-500/30 text-blue-500' },
                { value: 'warning', label: 'Varování', color: 'border-orange-500/30 text-orange-500' },
                { value: 'error', label: 'Kritické', color: 'border-red-500/30 text-red-500' },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setConfigValues({ ...configValues, global_banner_type: opt.value })} className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${opt.color} ${configValues.global_banner_type === opt.value ? 'bg-white/10' : 'bg-transparent opacity-50'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button onClick={handleSaveConfig} disabled={isSavingConfig} className="flex items-center gap-2 px-6 py-2 bg-red-500 text-white text-sm font-bold rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50">
              <Save className="w-4 h-4" /> {isSavingConfig ? 'Ukládám...' : 'Uložit nastavení platformy'}
            </button>
          </div>
        </div>
      </div>

      {/* Team Management Section */}
      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-yellow/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-yellow" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Správa týmu</h2>
              <p className="text-sm text-gray-400">Pozvěte a spravujte členy týmu (Podpora, Zhotovitelé)</p>
            </div>
          </div>
          <button
            onClick={generateInviteLink}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors border border-white/10 disabled:opacity-50"
          >
            <LinkIcon className="w-4 h-4" />
            {isGenerating ? 'Generuji...' : 'Vygenerovat zvací odkaz'}
          </button>
        </div>

        {inviteLink && (
          <div className="p-6 border-b border-white/5 bg-brand-yellow/5">
            <label className="text-sm font-medium text-brand-yellow mb-2 block">Nový zvací odkaz (platnost 7 dní)</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-4 py-2 bg-[#111] border border-brand-yellow/20 rounded-lg text-white outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 bg-brand-yellow text-black text-sm font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Zkopírováno' : 'Kopírovat'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Pošlete tento odkaz novému zaměstnanci. Po registraci bude vyžadovat vaše schválení.
            </p>
          </div>
        )}

        <div className="p-0">
          {teamMembers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-1">Zatím nemáte žádné členy týmu</h3>
              <p className="text-gray-400 text-sm">Vygenerujte zvací odkaz a pošlete ho svým kolegům.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {teamMembers.map((member) => (
                <div key={member.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white font-bold">
                      {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium">{member.name || 'Bez jména'}</h3>
                        {getRoleBadge(member.role)}
                      </div>
                      <p className="text-sm text-gray-400">{member.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {(member.role === 'PENDING_SUPPORT' || member.role === 'PENDING_CONTRACTOR') && (
                      <button
                        onClick={() => handleApproveClick(member.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 text-sm font-medium rounded-lg transition-colors border border-green-500/20"
                      >
                        <Check className="w-4 h-4" />
                        Schválit
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.id, member.name || member.email)}
                      className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Odstranit"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center gap-3 mb-4 text-brand-yellow">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-xl font-bold text-white">Potvrzení schválení</h3>
            </div>
            
            <p className="text-gray-400 text-sm mb-6">
              Pro schválení nového člena týmu zadejte prosím své administrátorské heslo.
            </p>

            <form onSubmit={confirmApproval} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Vaše heslo</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[#111] border border-white/10 rounded-lg text-white focus:border-brand-yellow focus:ring-1 focus:ring-brand-yellow outline-none"
                  placeholder="Zadejte své heslo"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isApproving || !password}
                  className="flex-1 px-4 py-2 bg-brand-yellow text-black text-sm font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
                >
                  {isApproving ? 'Schvaluji...' : 'Schválit člena'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
