'use client';

import { useMemo, useState } from 'react';
import { 
  Check, 
  X, 
  Clock, 
  Eye, 
  ExternalLink, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info 
} from 'lucide-react';
import { RoleRequest, User } from '@prisma/client';
import { motion, AnimatePresence } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';

type RequestWithUser = RoleRequest & { user: User };

const ROLE_COLORS: Record<string, string> = {
  TECHNICIAN: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  COMPANY_ADMIN: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  SVJ: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  REALTY: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  CUSTOMER: 'bg-gray-500/10 text-gray-400 border-white/5',
};

function defaultValidUntilDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

export default function RoleRequestsClient({ initialRequests }: { initialRequests: RequestWithUser[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Modals / detailed inspection state
  const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null);
  const [approveForId, setApproveForId] = useState<string | null>(null);
  const [rejectForId, setRejectForId] = useState<string | null>(null);
  const [validUntil, setValidUntil] = useState(defaultValidUntilDate);

  const approveRequest = useMemo(() => requests.find((r) => r.id === approveForId), [requests, approveForId]);
  const rejectRequest = useMemo(() => requests.find((r) => r.id === rejectForId), [requests, rejectForId]);

  const openApprove = (reqId: string) => {
    setValidUntil(defaultValidUntilDate());
    setApproveForId(reqId);
  };

  const confirmApprove = async () => {
    if (!approveForId) return;
    setLoadingId(approveForId);
    try {
      const res = await fetch(`/api/admin/role-requests/${approveForId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'APPROVE', 
          revisionAuthValidUntil: ['TECHNICIAN', 'COMPANY_ADMIN'].includes(approveRequest?.requestedRole || '') ? validUntil : undefined 
        }),
      });

      if (res.ok) {
        const updatedRequest = await res.json();
        setRequests(requests.map(req => req.id === approveForId ? updatedRequest : req));
        setApproveForId(null);
        setSelectedRequest(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Nepodařilo se schválit žádost.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k neočekávané chybě.');
    } finally {
      setLoadingId(null);
    }
  };

  const confirmReject = async (reqId: string) => {
    setLoadingId(reqId);
    try {
      const res = await fetch(`/api/admin/role-requests/${reqId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REJECT' }),
      });

      if (res.ok) {
        const updatedRequest = await res.json();
        setRequests(requests.map(req => req.id === reqId ? updatedRequest : req));
        setRejectForId(null);
        setSelectedRequest(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.message || 'Nepodařilo se zamítnout žádost.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k neočekávané chybě.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-[#111] p-4 sm:p-6 shadow-xl overflow-hidden">
        <div className="table-scroll -mx-2 px-2 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-gray-500 border-b border-white/5 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="pb-3 pl-2">Uživatel</th>
                <th className="pb-3">Aktuální & Požadovaná role</th>
                <th className="pb-3">Zažádáno</th>
                <th className="pb-3">Stav</th>
                <th className="pb-3 text-right pr-2">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-500">
                    Žádné žádosti o změnu role.
                  </td>
                </tr>
              ) : (
                requests.map((req, index) => (
                  <motion.tr 
                    key={req.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.04 }}
                    className="group hover:bg-white/[0.02]"
                  >
                    <td className="py-4 pl-2 align-middle">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedRequest(req)}
                          className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                          title="Zobrazit detail profilu a oprávnění"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <div>
                          <span className="text-white font-medium block">{req.user.name || 'Bez jména'}</span>
                          <span className="text-xs text-gray-500 font-mono block sm:inline">{req.user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center text-[10px] uppercase font-semibold px-2 py-0.5 rounded border border-white/5 text-gray-400 bg-white/5`}>
                          {getRoleDisplayName(req.user.role)}
                        </span>
                        <span className="text-gray-500 text-xs">➔</span>
                        <span className={`inline-flex items-center text-[10px] uppercase font-semibold px-2 py-0.5 rounded border ${ROLE_COLORS[req.requestedRole] || 'border-white/5 text-white'}`}>
                          {getRoleDisplayName(req.requestedRole)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 align-middle text-gray-500 whitespace-nowrap text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.createdAt).toLocaleString('cs-CZ')}
                      </span>
                    </td>
                    <td className="py-4 align-middle">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        req.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                        req.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        {req.status === 'APPROVED' && <Check className="w-3.5 h-3.5" />}
                        {req.status === 'REJECTED' && <X className="w-3.5 h-3.5" />}
                        {req.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                        {req.status === 'APPROVED' ? 'Schváleno' :
                         req.status === 'REJECTED' ? 'Zamítnuto' : 'Čeká'}
                      </span>
                    </td>
                    <td className="py-4 text-right align-middle pr-2">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(req)}
                          className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          Zobrazit profil & oprávnění
                        </button>
                        {req.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => openApprove(req.id)}
                              disabled={loadingId === req.id}
                              className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                              title="Schválit žádost"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectForId(req.id)}
                              disabled={loadingId === req.id}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                              title="Zamítnout žádost"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {/* Full request detail modal */}
        {selectedRequest && (
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
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h2 className="text-xl font-bold text-white">{selectedRequest.user.name || 'Bez jména'}</h2>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                      {getRoleDisplayName(selectedRequest.user.role)}
                    </div>
                    <span className="text-gray-500 text-xs">➔</span>
                    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${ROLE_COLORS[selectedRequest.requestedRole] || 'border-white/5 text-white'}`}>
                      {getRoleDisplayName(selectedRequest.requestedRole)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 font-mono mt-1">{selectedRequest.user.email}</p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main content split */}
              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/10">
                {/* Details side */}
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4">Profil a identifikace uživatele</h3>
                    <div className="bg-[#1b1b1b]/50 border border-white/5 rounded-xl p-4 space-y-4 text-sm text-gray-300">
                      <div className="flex items-start gap-3">
                        <Mail className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">E-mailová adresa</p>
                          <a href={`mailto:${selectedRequest.user.email}`} className="text-white hover:underline leading-tight font-mono text-xs">{selectedRequest.user.email}</a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Phone className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Telefon</p>
                          <a href={`tel:${selectedRequest.user.phone}`} className="text-white hover:underline leading-tight">{selectedRequest.user.phone || 'Nezadáno'}</a>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Adresa / Sídlo</p>
                          <span className="text-white leading-tight block">{selectedRequest.user.address || 'Nezadáno'}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 text-gray-500 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">IČO</p>
                          <span className="text-white leading-tight block">{selectedRequest.user.ico || 'Nezadáno'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadatas & extra fields */}
                  <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider mb-4">Doplňující informace</h3>
                    <div className="bg-[#1b1b1b]/40 border border-white/5 rounded-xl p-4 space-y-3 text-sm text-gray-400">
                      <div>
                        <span className="text-xs text-gray-500 block">Datum podání žádosti</span>
                        <span className="text-white font-medium">{new Date(selectedRequest.createdAt).toLocaleString('cs-CZ')}</span>
                      </div>
                      
                      {selectedRequest.user.expectedTechnicians != null && (
                        <div>
                          <span className="text-xs text-gray-500 block">Plánovaný počet techniků</span>
                          <span className="text-white font-semibold">{selectedRequest.user.expectedTechnicians}</span>
                        </div>
                      )}

                      {selectedRequest.user.pendingCompanyInviteCode && (
                        <div>
                          <span className="text-xs text-gray-500 block">Zvací kód sítě k přiřazení</span>
                          <span className="text-amber-400 font-mono font-semibold">{selectedRequest.user.pendingCompanyInviteCode}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-xs text-gray-500 block">Aktuální stav schválení žádosti</span>
                        <span className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold ${
                          selectedRequest.status === 'APPROVED' ? 'bg-green-500/10 text-green-500' :
                          selectedRequest.status === 'REJECTED' ? 'bg-red-500/10 text-red-500' :
                          'bg-yellow-500/10 text-yellow-500'
                        }`}>
                          {selectedRequest.status === 'APPROVED' ? 'Schváleno' :
                           selectedRequest.status === 'REJECTED' ? 'Zamítnuto' : 'Čeká na vyjádření'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submited proof preview */}
                <div className="p-6 flex flex-col justify-between">
                  <div className="space-y-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs uppercase font-semibold text-gray-500 tracking-wider">Nahrané oprávnění provádět revize</h3>
                      {selectedRequest.user.licenseMimeType && (
                        <a
                          href={`/api/admin/pending-registrations/${selectedRequest.userId}/license`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-yellow hover:underline flex items-center gap-1.5"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Otevřít na plné stránce
                        </a>
                      )}
                    </div>

                    <div className="flex-1 min-h-[250px] bg-[#0d0d0d] border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center relative overflow-hidden">
                      {selectedRequest.user.licenseMimeType ? (
                        <iframe
                          src={`/api/admin/pending-registrations/${selectedRequest.userId}/license`}
                          className="w-full h-full min-h-[250px] rounded-lg border-0 bg-white"
                          title="Náhled nahraného oprávnění"
                        />
                      ) : (
                        <div className="text-center p-6 space-y-2">
                          <FileText className="w-10 h-10 text-gray-600 mx-auto" />
                          <p className="text-sm text-gray-400">Prozatím nenahráno</p>
                          <p className="text-xs text-gray-500 leading-normal max-w-[240px] mx-auto">Tento uživatel nepřipojil k profilu naskenované oprávnění nebo certifikát.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions right here */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                    {selectedRequest.status === 'PENDING' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setRejectForId(selectedRequest.id)}
                          className="flex-1 py-3 px-4 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-500 font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Zamítnout žádost
                        </button>
                        <button
                          type="button"
                          onClick={() => openApprove(selectedRequest.id)}
                          className="flex-1 py-3 px-4 bg-green-500 hover:bg-green-600 active:bg-green-700 text-black font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
                        >
                          Schválit & Změnit roli…
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedRequest(null)}
                        className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm rounded-xl transition-colors text-center"
                      >
                        Zavřít detail
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Rejection verification dialog */}
        {rejectForId && rejectRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-red-500 mb-3">
                <XCircle className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-semibold text-white">Zamítnout žádost</h3>
              </div>

              <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                Opravdu si přejete zamítnout žádost uživatele <strong className="text-white">{rejectRequest.user.name || rejectRequest.user.email}</strong> o změnu role na <span className="text-red-400 font-semibold">{getRoleDisplayName(rejectRequest.requestedRole)}</span>?
              </p>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setRejectForId(null)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="button"
                  onClick={() => void confirmReject(rejectForId)}
                  disabled={loadingId === rejectForId}
                  className="rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {loadingId === rejectForId ? 'Zpracovávám…' : 'Zamítnout žádost'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Approval setting dialog with valid-until date */}
        {approveForId && approveRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1A1A1A] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-2 text-emerald-500 mb-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <h3 className="text-lg font-semibold text-white">Schválit změnu role</h3>
              </div>

              <p className="text-sm text-gray-400 mb-4 leading-relaxed">
                Schválením žádosti udělíte uživateli <strong className="text-white">{approveRequest.user.name}</strong> plné oprávnění pro roli <span className="text-green-400 font-semibold">{getRoleDisplayName(approveRequest.requestedRole)}</span>.
              </p>

              {['TECHNICIAN', 'COMPANY_ADMIN'].includes(approveRequest.requestedRole) ? (
                <div className="space-y-4">
                  <div className="flex items-start gap-2.5 p-3 bg-brand-yellow/10 border border-brand-yellow/25 rounded-xl">
                    <Info className="w-4.5 h-4.5 text-brand-yellow shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-200 leading-normal">
                      Uživatel žádá o profesní roli, která vyžaduje provádění revizí. Zadejte platnost jeho revizního oprávnění.
                    </p>
                  </div>
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
                </div>
              ) : (
                <div className="bg-[#1b1b1b] border border-white/5 rounded-xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-normal">
                    Schvalovaná role nevyžaduje revizní oprávnění s omezenou platností. Změna se projeví okamžitě.
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
                  {loadingId === approveForId ? 'Ukládám…' : 'Schválit a změnit roli'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
