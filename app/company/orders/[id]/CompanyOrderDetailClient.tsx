'use client';

import { useState } from 'react';
import { ArrowLeft, MapPin, User, Phone, Calendar, CheckCircle2, AlertTriangle, Briefcase, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ChatSection } from '@/components/ChatSection';

export default function CompanyOrderDetailClient({ order, currentUser, technicians }: { order: any, currentUser: any, technicians: any[] }) {
  const [status, setStatus] = useState(
    order.status === 'COMPLETED' ? 'completed' : 
    order.status === 'IN_PROGRESS' ? 'in_progress' : 
    order.status === 'NEEDS_REVISION' ? 'needs_revision' : 'pending'
  );
  const [isClaiming, setIsClaiming] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedTech, setSelectedTech] = useState('');
  const router = useRouter();

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/claim`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('Zakázka byla úspěšně přijata.');
        router.refresh();
      } else {
        alert('Došlo k chybě při přijímání zakázky.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při přijímání zakázky.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTech) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/company/orders/${order.readableId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: selectedTech }),
      });
      if (res.ok) {
        alert('Zakázka byla úspěšně přiřazena technikovi.');
        router.refresh();
      } else {
        alert('Došlo k chybě při přiřazování zakázky.');
      }
    } catch (error) {
      console.error(error);
      alert('Došlo k chybě při přiřazování zakázky.');
    } finally {
      setIsAssigning(false);
    }
  };

  const canClaim = order.isPublic && order.status === 'PENDING' && !order.companyId;
  const canAssign = order.companyId === currentUser.id && !order.technicianId && order.status !== 'COMPLETED';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-5xl space-y-6 px-1 sm:px-0"
    >
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href="/company/orders" className="shrink-0 self-start rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:mt-0.5">
            <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <h1 className="text-xl font-bold text-white sm:text-2xl">{order.serviceType}</h1>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        status === 'completed' ? 'bg-green-500/10 text-green-500' : 
                        status === 'in_progress' ? 'bg-blue-500/10 text-blue-500' :
                        status === 'needs_revision' ? 'bg-orange-500/10 text-orange-500' :
                        'bg-yellow-500/10 text-yellow-500'
                    }`}>
                        {status === 'completed' ? 'Dokončeno' : 
                         status === 'in_progress' ? 'Probíhá' : 
                         status === 'needs_revision' ? 'K přepracování' : 'Čeká na přijetí'}
                    </span>
                    {order.isPublic && order.status === 'PENDING' && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-yellow/10 text-brand-yellow">
                        Veřejná poptávka
                      </span>
                    )}
                </div>
                <p className="text-gray-400 text-sm mt-1">ID: #{order.readableId}</p>
            </div>
            
            {canClaim && (
              <button
                onClick={handleClaim}
                disabled={isClaiming}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 py-2.5 text-sm font-semibold text-black shadow-lg shadow-brand-yellow/10 transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto sm:text-base"
              >
                {isClaiming ? 'Přijímám...' : <><Briefcase className="w-4 h-4" /> Přijmout zakázku pro firmu</>}
              </button>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
            {/* Client Info Card */}
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Informace o zakázce</h3>
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-400">Adresa</p>
                            <p className="text-white">{order.address}</p>
                            <a href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-yellow hover:underline">Zobrazit na mapě</a>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-400">Zákazník</p>
                            <p className="text-white">{order.customer.name || order.customer.email}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Phone className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-400">Telefon</p>
                            <a href={`tel:${order.customer.phone || ''}`} className="text-white hover:text-brand-yellow transition-colors">{order.customer.phone || 'Nenastaveno'}</a>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-400">Vytvořeno</p>
                            <p className="text-white">{new Date(order.createdAt).toLocaleString('cs-CZ')}</p>
                        </div>
                    </div>
                </div>
                
                {order.notes && (
                    <div className="mt-6 pt-6 border-t border-white/5">
                        <p className="text-sm text-gray-400 mb-2">Poznámka od zákazníka:</p>
                        <div className="bg-[#111] p-3 rounded-lg text-sm text-gray-300 italic">
                            &quot;{order.notes}&quot;
                        </div>
                    </div>
                )}
            </div>

            {/* Assignment Section */}
            {canAssign && (
              <div className="bg-[#1A1A1A] border border-brand-yellow/30 rounded-xl p-6 shadow-[0_0_15px_rgba(242,125,38,0.1)]">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5 text-brand-yellow" />
                    Přiřadit technikovi
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Tato zakázka patří vaší firmě, ale zatím nebyla přiřazena žádnému technikovi.
                  </p>
                  
                  <form onSubmit={handleAssign} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-400">Vyberte technika</label>
                      <select 
                        value={selectedTech}
                        onChange={(e) => setSelectedTech(e.target.value)}
                        className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-white focus:border-brand-yellow outline-none"
                        required
                      >
                        <option value="">Vyberte...</option>
                        {technicians.map(tech => (
                          <option key={tech.id} value={tech.id}>{tech.name || tech.email}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      type="submit" 
                      disabled={isAssigning || !selectedTech}
                      className="w-full py-2.5 bg-brand-yellow text-black font-semibold rounded-lg hover:bg-brand-yellow-hover transition-colors disabled:opacity-50"
                    >
                      {isAssigning ? 'Přiřazuji...' : 'Přiřadit zakázku'}
                    </button>
                  </form>
              </div>
            )}

            {/* Chat Section */}
            {!canClaim && (
              <div className="h-[500px]">
                <ChatSection orderId={order.id} currentUserId={currentUser.id} />
              </div>
            )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Stav zakázky</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-500">Přiřazený technik</p>
                    <p className="text-sm font-medium text-white mt-1">
                      {order.technician ? order.technician.name || order.technician.email : 'Zatím nepřiřazeno'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Datum přijetí firmou</p>
                    <p className="text-sm font-medium text-white mt-1">
                      {order.assignedAt ? new Date(order.assignedAt).toLocaleString('cs-CZ') : 'N/A'}
                    </p>
                  </div>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}
