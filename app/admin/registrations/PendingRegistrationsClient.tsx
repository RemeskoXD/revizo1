'use client';

import { useMemo, useState } from 'react';
import { 
  Check, 
  X, 
  ExternalLink, 
  Clock, 
  Building2, 
  Wrench, 
  Calendar, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Building,
  User,
  XCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type PendingRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  phone: string | null;
  address: string | null;
  ico: string | null;
  expectedTechnicians: number | null;
  pendingCompanyInviteCode: string | null;
  licenseMimeType: string | null;
  createdAt: string;
};

const ROLE_PRESET: Record<string, { label: string; color: string; icon: any }> = {
  TECHNICIAN: { label: 'Revizní technik', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: Wrench },
  COMPANY_ADMIN: { label: 'Firma / Manažer', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Building2 },
  SVJ: { label: 'SVJ / Bytový dům', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: Building },
  REALTY: { label: 'Realitní makléř', color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', icon: User },
  CUSTOMER: { label: 'Zákazník', color: 'bg-gray-500/10 text-gray-400 border-white/5', icon: User },
};

function defaultValidUntilDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function PendingRegistrationsClient({ initialRows, categories }: { initialRows: PendingRow[], categories: { id: string; name: string; group: string }[] }) {
  const [rows, setRows] = useState(initialRows);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // Modals / states
  const [approveForId, setApproveForId] = useState<string | null>(null);
  const [rejectForId, setRejectForId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedRow, setSelectedRow] = useState<PendingRow | null>(null);
  const [validUntil, setValidUntil] = useState(defaultValidUntilDate);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const approveRow = useMemo(() => rows.find((r) => r.id === approveForId), [rows, approveForId]);
  const rejectRow = useMemo(() => rows.find((r) => r.id === rejectForId), [rows, rejectForId]);

  const openApprove = (userId: string) => {
    setValidUntil(defaultValidUntilDate());
    setSelectedCategoryIds([]);
    setApproveForId(userId);
  };

  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const confirmApprove = async () => {
    if (!approveForId) return;
    setLoadingId(approveForId);
    try {
      const res = await fetch(`/api/admin/pending-registrations/${approveForId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', revisionAuthValidUntil: validUntil, authorizedCategoryIds: selectedCategoryIds }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== approveForId));
        setApproveForId(null);
        setSelectedRow(null); // Close detail modal if open
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Nepodařilo se schválit registraci.');
      }
    } catch {
      alert('Došlo k neočekávané chybě.');
    } finally {
      setLoadingId(null);
    }
  };

  const openReject = (userId: string) => {
    setRejectionReason('');
    setRejectForId(userId);
  };

  const confirmReject = async () => {
    if (!rejectForId) return;
    if (!rejectionReason.trim()) {
      alert('Prosím uveďte důvod zamítnutí pro informování klienta.');
      return;
    }

    setLoadingId(rejectForId);
    try {
      const res = await fetch(`/api/admin/pending-registrations/${rejectForId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', reason: rejectionReason }),
      });
      if (res.ok) {
        setRows((r) => r.filter((x) => x.id !== rejectForId));
        setRejectForId(null);
        setSelectedRow(null); // Close detail modal if open
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || 'Nepodařilo se zamítnout registraci.');
      }
    } catch {
      alert('Došlo k chybě při zamítání.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-[#111] p-4 sm:p-6 shadow-xl overflow-hidden">
        <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-gray-500 border-b border-white/5 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="pb-3 pl-2">Uživatel / Role</th>
                <th className="pb-3">Kontakt & ID</th>
                <th className="pb-3">Registrován</th>
                <th className="pb-3 text-right pr-2">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    Žádné čekající registrace k ověření.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => {
                  const preset = ROLE_PRESET[row.role] || ROLE_PRESET.CUSTOMER;
                  const RoleIcon = preset.icon;

                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="group hover:bg-white/[0.02]"
                    >
                      <td className="py-4 pl-2 align-middle">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setSelectedRow(row)}
                            className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                            title="Zobrazit celý profil"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium text-sm block sm:inline">{row.name}</span>
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${preset.color}`}>
                                <RoleIcon className="w-3 h-3" />
                                {preset.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 align-middle text-gray-400 text-xs">
                        <div className="space-y-0.5">
                          {row.phone && <p className="truncate">Tel: {row.phone}</p>}
                          {row.ico && <p className="text-gray-500">IČO: {row.ico}</p>}
                          {row.role === 'TECHNICIAN' && (
                            <span className="text-[10px] bg-amber-500/5 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/10">Má nahráno oprávnění</span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 align-middle text-gray-500 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(row.createdAt).toLocaleString('cs-CZ')}
                        </span>
                      </td>
                      <td className="py-4 text-right align-middle pr-2">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedRow(row)}
                            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors"
                          >
                            Zobrazit celý profil
                          </button>
                          <button
                            type="button"
                            onClick={() => openApprove(row.id)}
                            disabled={loadingId === row.id}
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                            title="Schválit"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openReject(row.id)}
                            disabled={loadingId === row.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
                            title="Zamítnout"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {/* Full user details modal */}
        {selectedRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl bg-[#141414] border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col my-8"
            >
              {/* Header */}
              <div className="p-6 border-b border-white/10 flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{selectedRow.name || 'Bez jména'}</h2>
                    {(() => {
                      const preset = ROLE_PRESET[selectedRow.role] || ROLE_PRESET.CUSTOMER;
                      const RoleIcon = preset.icon;
                      return (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${preset.color}`}>
                          <RoleIcon className="w-3.5 h-3.5" />
                          {preset.label}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-sm text-gray-500 font-mono mt-1">{selectedRow.email}</p>
                </div>
                <button
                  onClick={() => setSelectedRow(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main content split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                {/* Details side */}
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4">Profil a identifikace</h3>
                    <div className="bg-[#1b1b1b]/50 border border-white/5 rounded-xl p-4 space-y-4 text-sm text-gray-300">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">E-mailová adresa</p>
                          <a href={`mailto:${selectedRow.email}`} className="text-white hover:underline leading-tight font-mono text-xs">{selectedRow.email}</a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Telefon</p>
                          <a href={`tel:${selectedRow.phone}`} className="text-white hover:underline leading-tight">{selectedRow.phone || 'Nezadáno'}</a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Adresa / Sídlo</p>
                          <span className="text-white leading-tight block">{selectedRow.address || 'Nezadáno'}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">IČO</p>
                          <span className="text-white leading-tight block">{selectedRow.ico || 'Nezadáno'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadatas & extra fields */}
                  <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4">Doplňující informace</h3>
                    <div className="bg-[#1b1b1b]/40 border border-white/5 rounded-xl p-4 space-y-3 text-sm text-gray-400">
                      <div>
                        <span className="text-xs text-gray-500 block">Registrován dne</span>
                        <span className="text-white font-medium">{new Date(selectedRow.createdAt).toLocaleString('cs-CZ')}</span>
                      </div>
                      
                      {selectedRow.role === 'COMPANY_ADMIN' && selectedRow.expectedTechnicians != null && (
                        <div>
                          <span className="text-xs text-gray-500 block">Plánovaný počet techniků</span>
                          <span className="text-white font-semibold">{selectedRow.expectedTechnicians}</span>
                        </div>
                      )}

                      {selectedRow.pendingCompanyInviteCode && (
                        <div>
                          <span className="text-xs text-gray-500 block">Zvací kód firmy k přiřazení</span>
                          <span className="text-amber-400 font-mono font-semibold">{selectedRow.pendingCompanyInviteCode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submited proof preview */}
                <div className="p-6 flex flex-col justify-between">
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Předložené oprávnění / dokument</h3>
                      <a
                        href={`/api/admin/pending-registrations/${selectedRow.id}/license`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-yellow hover:underline flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Otevřít na plné stránce
                      </a>
                    </div>

                    <div className="flex-1 min-h-[250px] bg-[#0d0d0d] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden group">
                      {selectedRow.licenseMimeType ? (
                        <iframe
                          src={`/api/admin/pending-registrations/${selectedRow.id}/license`}
                          className="w-full h-full min-h-[250px] rounded-lg border-0 bg-white"
                          title="Náhled nahraného oprávnění"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                          <p className="text-sm text-gray-400">Náhled dokumentu není k dispozici</p>
                          <p className="text-xs text-gray-500 leading-normal">Můžete jej stáhnout nebo otevřít v novém okně.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions right here */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => openReject(selectedRow.id)}
                      className="flex-1 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Zamítnout s důvodem
                    </button>
                    <button
                      type="button"
                      onClick={() => openApprove(selectedRow.id)}
                      className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-black font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
                    >
                      Schválit / Aktivovat...
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Rejection with Reason dialog */}
        {rejectForId && rejectRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-red-500 mb-3">
                <XCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-semibold text-white">Zamítnout registraci</h3>
              </div>

              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Opravdu si přejete zamítnout registraci uživatele <strong className="text-white">{rejectRow.name}</strong>? 
                Napište vyjádření s odůvodněním – to bude odesláno uživateli e-mailem, aby věděl, co má opravit či doložit.
              </p>

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">
                  Důvod zamítnutí (odešle se e-mailem)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Např.: Průkaz oprávnění k revizím je nečitelný, nebo jeho platnost již v minulosti vypršela. Prosím nahrajte aktualizovaný dokument."
                  rows={4}
                  className="w-full rounded-xl border border-white/10 bg-[#111] py-2.5 px-3.5 text-white text-sm focus:outline-none focus:border-red-500/50 resize-y transition-all"
                  required
                />
              </div>

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRejectForId(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={() => void confirmReject()}
                  disabled={loadingId === rejectForId}
                  className="rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 justify-center cursor-pointer"
                >
                  {loadingId === rejectForId ? 'Odesílám…' : 'Odeslat zamítnutí'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Approval validity dialog */}
        {approveForId && approveRow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-emerald-500 mb-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-semibold text-white">Schválit registraci</h3>
              </div>

              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Uživatel <strong className="text-white">{approveRow.name}</strong> ({approveRow.email}) získá plný aktivní přístup jako <span className="text-green-400 font-semibold">{ROLE_PRESET[approveRow.role]?.label || approveRow.role}</span>.
              </p>

              {['TECHNICIAN', 'COMPANY_ADMIN'].includes(approveRow.role) ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-400">
                    Zadejte, do kdy platí jeho nahrané <strong className="text-brand-yellow">oprávnění provádět revize</strong>.
                  </p>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-gray-400 mb-1.5 tracking-wider">
                      Platnost oprávnění do
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full rounded-xl border border-white/10 bg-[#111] py-2.5 pl-10 pr-3.5 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
                        required
                      />
                    </div>
                  </div>

                  {categories?.length > 0 && (
                    <div className="pt-2">
                       <label className="block text-xs font-semibold uppercase text-gray-400 mb-2.5 tracking-wider">
                        Druhy revizí s povolením
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1 stylish-scrollbar">
                        {categories.map((cat) => (
                           <label key={cat.id} className="flex items-start gap-2.5 p-2 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 cursor-pointer transition-colors group">
                             <div className="mt-0.5 flex items-center justify-center w-4 h-4 rounded border border-white/20 bg-black/20 group-hover:border-emerald-500/50 transition-colors shrink-0">
                               {selectedCategoryIds.includes(cat.id) && <Check className="w-3 h-3 text-emerald-500" />}
                             </div>
                             <input type="checkbox" className="sr-only" checked={selectedCategoryIds.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />
                             <div className="text-xs">
                               <p className="text-white font-medium leading-tight">{cat.name}</p>
                               <p className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">{cat.group}</p>
                             </div>
                           </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#1b1b1b] border border-white/5 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-normal">
                    Tato role nevyžaduje ověřování revizní autorizace s pevnou platností. Aktivace účtu proběhne neprodleně.
                  </p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setApproveForId(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={() => void confirmApprove()}
                  disabled={loadingId === approveForId}
                  className="rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 px-5 py-2.5 text-sm font-semibold text-black transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {loadingId === approveForId ? 'Ukládám…' : 'Schválit a nastavit aktivní'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
