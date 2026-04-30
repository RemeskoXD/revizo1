'use client';

import { useState } from 'react';
import { User as UserIcon, Mail, Phone, Briefcase, Plus, Copy, Check, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { User, Order, CompanyJoinRequest } from '@prisma/client';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TechnicianWithOrders = User & { assignedOrders: Order[] };
type JoinRequestWithTech = CompanyJoinRequest & { technician: { id: string, name: string | null, email: string | null, phone: string | null } };

export default function CompanyTechniciansClient({ technicians, joinRequests, companyCode }: { technicians: TechnicianWithOrders[], joinRequests: JoinRequestWithTech[], companyCode: string }) {
  const [copied, setCopied] = useState(false);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const router = useRouter();

  const handleCopyCode = () => {
    navigator.clipboard.writeText(companyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemoveTechnician = async (techId: string, techName: string | null) => {
    if (!confirm(`Opravdu chcete odebrat technika ${techName || 'Neznámý'} z vaší firmy? Všechny jeho nepřiřazené zakázky budou vráceny firmě.`)) {
      return;
    }

    setIsRemoving(techId);
    try {
      const res = await fetch(`/api/company/technicians/${techId}/remove`, {
        method: 'PATCH',
      });

      if (res.ok) {
        alert('Technik byl úspěšně odebrán.');
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Došlo k chybě při odebírání technika.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při odebírání technika.');
    } finally {
      setIsRemoving(null);
    }
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setIsProcessingRequest(requestId);
    try {
      const res = await fetch(`/api/company/requests/${requestId}/${action}`, {
        method: 'POST',
      });

      if (res.ok) {
        alert(`Žádost byla úspěšně ${action === 'approve' ? 'schválena' : 'zamítnuta'}.`);
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || 'Došlo k chybě při zpracování žádosti.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při zpracování žádosti.');
    } finally {
      setIsProcessingRequest(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Naši technici</h1>
          <p className="text-gray-400">Správa techniků vaší firmy.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#111] border border-white/10 rounded-lg px-4 py-2 flex items-center gap-3">
            <span className="text-sm text-gray-400">Kód firmy:</span>
            <span className="text-sm font-mono font-bold text-white">{companyCode}</span>
            <button 
              onClick={handleCopyCode}
              className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
              title="Kopírovat kód"
            >
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Pending Join Requests */}
      {joinRequests.length > 0 && (
        <div className="bg-[#1A1A1A] border border-brand-yellow/30 rounded-xl overflow-hidden">
          <div className="p-4 bg-brand-yellow/10 border-b border-brand-yellow/20">
            <h2 className="text-lg font-bold text-brand-yellow flex items-center gap-2">
              <UserIcon className="w-5 h-5" /> Čekající žádosti o připojení ({joinRequests.length})
            </h2>
          </div>
          <div className="divide-y divide-white/5">
            {joinRequests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-white font-medium">{req.technician.name || 'Neznámý technik'}</h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {req.technician.email}</span>
                    {req.technician.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {req.technician.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequest(req.id, 'reject')}
                    disabled={isProcessingRequest === req.id}
                    className="px-3 py-1.5 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" /> Zamítnout
                  </button>
                  <button
                    onClick={() => handleRequest(req.id, 'approve')}
                    disabled={isProcessingRequest === req.id}
                    className="px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" /> Schválit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Technician Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-[#1A1A1A] border-2 border-dashed border-white/10 rounded-xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]"
        >
          <div className="w-12 h-12 rounded-full bg-brand-yellow/10 flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-brand-yellow" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Přidat technika</h3>
          <p className="text-sm text-gray-500">
            Požádejte technika, aby se zaregistroval a v nastavení zadal váš kód firmy.
          </p>
        </motion.div>

        {/* Technician Cards */}
        {technicians.map((tech, index) => (
          <motion.div 
            key={tech.id} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 * (index + 1) }}
            className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#111] border border-white/10 flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-white">
                    <Link href={`/company/technicians/${tech.id}`} className="hover:text-brand-yellow transition-colors">
                      {tech.name || 'Neznámý'}
                    </Link>
                  </h3>
                  <p className="text-xs text-brand-yellow font-medium">Technik</p>
                </div>
              </div>
              <button
                onClick={() => handleRemoveTechnician(tech.id, tech.name)}
                disabled={isRemoving === tech.id}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                title="Odebrat technika"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6 flex-1">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Mail className="w-4 h-4" />
                <span className="truncate">{tech.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Phone className="w-4 h-4" />
                <span>{tech.phone || 'Nenastaveno'}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400">Aktivní zakázky:</span>
                <span className="text-white font-bold">{tech.assignedOrders.length}</span>
              </div>
              <Link href={`/company/technicians/${tech.id}`} className="text-xs text-brand-yellow hover:underline">
                Zobrazit detail
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
