'use client';

import { useState } from 'react';
import { 
  ArrowLeft, MapPin, User, Phone, Calendar, Upload, FileText, 
  CheckCircle2, Briefcase, DollarSign, Clock, Edit3, Save, 
  ShieldCheck, ClipboardCheck, MessageSquare, ChevronDown, ChevronUp,
  Navigation, History, Mic, MicOff
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { ChatSection } from '@/components/ChatSection';
import { ChecklistSection } from '@/components/ChecklistSection';
import { PhotoSection } from '@/components/PhotoSection';

export default function JobDetailClient({ order, currentUser, addressHistory = [] }: { order: any, currentUser: any, addressHistory?: any[] }) {
  const router = useRouter();

  const [status, setStatus] = useState(order.status);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);

  // Scheduling
  const [scheduledDate, setScheduledDate] = useState(order.scheduledDate ? new Date(order.scheduledDate).toISOString().slice(0, 16) : '');
  const [scheduledNote, setScheduledNote] = useState(order.scheduledNote || '');
  const [confirmedAddress, setConfirmedAddress] = useState(order.confirmedAddress || order.address);
  const [editingSchedule, setEditingSchedule] = useState(false);

  // Completion
  const [file, setFile] = useState<File | null>(null);
  const [revisionResult, setRevisionResult] = useState<string>('PASS');
  const [revisionNotes, setRevisionNotes] = useState('');
  const [nextRevisionDate, setNextRevisionDate] = useState(order.nextRevisionDate ? new Date(order.nextRevisionDate).toISOString().slice(0, 10) : '');
  const [defectsFixed, setDefectsFixed] = useState(false);
  const [safeForUse, setSafeForUse] = useState(false);

  // Chat toggle
  const [chatOpen, setChatOpen] = useState(false);

  // Voice dictation
  const [isListening, setIsListening] = useState(false);
  const startDictation = (setter: (val: string) => void, current: string) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Diktování není v tomto prohlížeči podporováno. Použijte Chrome.');
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'cs-CZ';
    recognition.continuous = true;
    recognition.interimResults = true;
    setIsListening(true);
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setter(current + (current ? ' ' : '') + transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
    setTimeout(() => { recognition.stop(); setIsListening(false); }, 30000);
  };

  const canClaim = order.isPublic && order.status === 'PENDING' && !order.technicianId && !order.companyId;
  const canStart = order.status === 'PENDING' && (order.technicianId === currentUser.id || order.companyId === currentUser.id);
  const isAssigned = order.technicianId === currentUser.id || order.companyId === currentUser.id;

  const handleClaim = async () => {
    setIsClaiming(true);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/claim`, { method: 'POST' });
      if (res.ok) { router.refresh(); } 
      else { alert('Chyba při přijímání zakázky.'); }
    } catch { alert('Chyba při přijímání zakázky.'); }
    finally { setIsClaiming(false); }
  };

  const handleStartWork = async () => {
    try {
      const res = await fetch(`/api/orders/${order.readableId}/start`, { method: 'POST' });
      if (res.ok) { setStatus('IN_PROGRESS'); router.refresh(); } 
      else { alert('Chyba.'); }
    } catch { alert('Chyba.'); }
  };

  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      const res = await fetch(`/api/orders/${order.readableId}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduledDate: scheduledDate || null,
          scheduledNote: scheduledNote || null,
          confirmedAddress: confirmedAddress !== order.address ? confirmedAddress : null,
          nextRevisionDate: nextRevisionDate || null,
        }),
      });
      if (res.ok) {
        setEditingSchedule(false);
        router.refresh();
      } else {
        alert('Chyba při ukládání termínu.');
      }
    } catch { alert('Chyba při ukládání termínu.'); }
    finally { setIsSavingSchedule(false); }
  };

  const handleComplete = async () => {
    if (!file) { alert('Nahrajte revizní zprávu (PDF).'); return; }
    if (!safeForUse && revisionResult === 'PASS') {
      alert('Potvrďte, že zařízení je schopné bezpečného provozu.'); return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64File = reader.result as string;
        const res = await fetch(`/api/orders/${order.readableId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportFile: base64File,
            revisionResult,
            revisionNotes: revisionNotes || null,
            nextRevisionDate: nextRevisionDate || null,
          }),
        });
        if (res.ok) {
          setStatus('COMPLETED');
          router.refresh();
        } else {
          const data = await res.json();
          alert(data.message || 'Chyba při dokončování.');
        }
        setIsUploading(false);
      };
      reader.onerror = () => { alert('Chyba při čtení souboru.'); setIsUploading(false); };
    } catch { alert('Chyba.'); setIsUploading(false); }
  };

  const statusLabel = (s: string) => ({
    'COMPLETED': 'Dokončeno', 'IN_PROGRESS': 'Probíhá',
    'NEEDS_REVISION': 'K přepracování', 'PENDING': 'Čeká', 'CANCELLED': 'Zrušeno',
  }[s] || s);

  const statusColor = (s: string) => ({
    'COMPLETED': 'bg-green-500/10 text-green-500',
    'IN_PROGRESS': 'bg-blue-500/10 text-blue-500',
    'NEEDS_REVISION': 'bg-orange-500/10 text-orange-500',
    'CANCELLED': 'bg-red-500/10 text-red-500',
  }[s] || 'bg-yellow-500/10 text-yellow-500');

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mx-auto max-w-6xl space-y-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <Link href="/technician/queue" className="shrink-0 self-start rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white sm:mt-0.5">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="text-xl font-bold text-white sm:text-2xl">{order.serviceType}</h1>
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", statusColor(status))}>{statusLabel(status)}</span>
              {order.isPublic && status === 'PENDING' && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-yellow/10 text-brand-yellow">Veřejná</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">#{order.readableId} · {order.propertyType} · {new Date(order.createdAt).toLocaleDateString('cs-CZ')}</p>
          </div>
          
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {canClaim && (
            <button onClick={handleClaim} disabled={isClaiming} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-yellow px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-brand-yellow-hover disabled:opacity-50 sm:w-auto">
              {isClaiming ? 'Přijímám...' : <><Briefcase className="h-4 w-4" /> Přijmout zakázku</>}
            </button>
          )}
          {canStart && (
            <button onClick={handleStartWork} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-600 sm:w-auto">
              <Clock className="h-4 w-4" /> Začít pracovat
            </button>
          )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Order Info + Schedule - Compact */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Zakázka</h3>
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-white text-sm">{order.confirmedAddress || order.address}</p>
                    {order.confirmedAddress && order.confirmedAddress !== order.address && (
                      <p className="text-xs text-orange-400 mt-0.5">Změněno z: {order.address}</p>
                    )}
                    <a href={`https://maps.google.com/?q=${encodeURIComponent(order.confirmedAddress || order.address)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-yellow hover:underline">Navigovat</a>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-white text-sm">{order.customer.name || order.customer.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                  <a href={`tel:${order.customer.phone || ''}`} className="text-white text-sm hover:text-brand-yellow transition-colors">{order.customer.phone || 'Nenastaveno'}</a>
                </div>
                {order.price && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-4 h-4 text-gray-500 shrink-0" />
                    <span className="text-brand-yellow text-sm font-medium">{order.price.toLocaleString('cs-CZ')} Kč</span>
                  </div>
                )}
                {order.notes && (
                  <div className="mt-3 p-3 bg-[#111] rounded-lg border border-white/5">
                    <p className="text-xs text-gray-400 mb-1">Poznámka zákazníka:</p>
                    <p className="text-sm text-gray-300 italic">&quot;{order.notes}&quot;</p>
                  </div>
                )}
              </div>

              {/* Right: Schedule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Plánování</h3>
                  {isAssigned && status !== 'COMPLETED' && (
                    <button onClick={() => setEditingSchedule(!editingSchedule)} className="text-xs text-brand-yellow hover:underline flex items-center gap-1">
                      <Edit3 className="w-3 h-3" /> {editingSchedule ? 'Zrušit' : 'Upravit'}
                    </button>
                  )}
                </div>

                {order.isUrgent && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300">
                    Urgentní objednávka – prioritní zařazení (cena zahrnuje příplatek).
                  </div>
                )}

                {order.preferredDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-600 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Preferovaný termín (orientační)</p>
                      <p className="text-sm text-gray-400">{new Date(order.preferredDate).toLocaleDateString('cs-CZ')}</p>
                      <p className="text-[11px] text-gray-600 mt-0.5">Můžete potvrdit nebo navrhnout jiný termín po domluvě.</p>
                    </div>
                  </div>
                )}

                {editingSchedule ? (
                  <div className="space-y-3 p-3 bg-[#111] rounded-lg border border-brand-yellow/20">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Naplánovaný termín</label>
                      <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded p-2 text-sm text-white focus:border-brand-yellow outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Adresa (změnit pokud je jiná)</label>
                      <input type="text" value={confirmedAddress} onChange={(e) => setConfirmedAddress(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded p-2 text-sm text-white focus:border-brand-yellow outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Poznámka k termínu</label>
                      <textarea value={scheduledNote} onChange={(e) => setScheduledNote(e.target.value)} rows={2} placeholder="Např. Budu tam v 9:00, zavolám předem..." className="w-full bg-[#0a0a0a] border border-white/10 rounded p-2 text-sm text-white focus:border-brand-yellow outline-none resize-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Další plánovaná revize (nepovinné)</label>
                      <input type="date" value={nextRevisionDate} onChange={(e) => setNextRevisionDate(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/10 rounded p-2 text-sm text-white focus:border-brand-yellow outline-none" />
                    </div>
                    <button onClick={handleSaveSchedule} disabled={isSavingSchedule} className="w-full py-2 bg-brand-yellow text-black font-semibold rounded text-sm hover:bg-brand-yellow-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                      <Save className="w-4 h-4" /> {isSavingSchedule ? 'Ukládám...' : 'Uložit termín'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-brand-yellow shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Naplánovaný termín</p>
                        <p className={cn("text-sm font-medium", order.scheduledDate ? "text-white" : "text-gray-600")}>
                          {order.scheduledDate ? new Date(order.scheduledDate).toLocaleString('cs-CZ') : 'Nenastaveno'}
                        </p>
                      </div>
                    </div>
                    {order.scheduledNote && (
                      <div className="p-2 bg-[#111] rounded border border-white/5">
                        <p className="text-xs text-gray-300">{order.scheduledNote}</p>
                      </div>
                    )}
                    {order.nextRevisionDate && (
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-500">Další revize</p>
                          <p className="text-sm text-green-400">{new Date(order.nextRevisionDate).toLocaleDateString('cs-CZ')}</p>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Completion Section */}
          {status === 'COMPLETED' ? (
            <div className="bg-[#1A1A1A] border border-green-500/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Revize dokončena</h3>
                  {order.completedAt && <p className="text-xs text-gray-500">{new Date(order.completedAt).toLocaleString('cs-CZ')}</p>}
                </div>
                {order.revisionResult && (
                  <span className={cn("ml-auto px-3 py-1 rounded-full text-xs font-bold",
                    order.revisionResult === 'PASS' ? 'bg-green-500/10 text-green-500' :
                    order.revisionResult === 'PASS_WITH_NOTES' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-red-500/10 text-red-500'
                  )}>
                    {order.revisionResult === 'PASS' ? 'BEZ ZÁVAD' : order.revisionResult === 'PASS_WITH_NOTES' ? 'S VÝHRADAMI' : 'NEVYHOVUJE'}
                  </span>
                )}
              </div>
              {order.revisionNotes && (
                <div className="p-3 bg-[#111] rounded-lg border border-white/5 mt-3">
                  <p className="text-xs text-gray-400 mb-1">Poznámky technika:</p>
                  <p className="text-sm text-gray-300">{order.revisionNotes}</p>
                </div>
              )}
              {order.nextRevisionDate && (
                <div className="flex items-center gap-2 mt-4 p-3 bg-brand-yellow/5 border border-brand-yellow/20 rounded-lg">
                  <ShieldCheck className="w-4 h-4 text-brand-yellow" />
                  <span className="text-sm text-brand-yellow">Další revize: {new Date(order.nextRevisionDate).toLocaleDateString('cs-CZ')}</span>
                </div>
              )}
            </div>
          ) : status === 'IN_PROGRESS' ? (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-6 space-y-5">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-brand-yellow" /> Dokončení revize
              </h3>

              {/* Built-in Report Form */}
              <Link href={`/technician/job/${order.readableId}/report`}
                className="flex items-center justify-center gap-3 p-4 bg-brand-yellow/10 border-2 border-brand-yellow/30 rounded-xl text-brand-yellow font-semibold hover:bg-brand-yellow/20 transition-colors">
                <FileText className="w-5 h-5" />
                Vyplnit revizní zprávu online
              </Link>

              <div className="flex items-center gap-3 text-gray-500">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs">nebo nahrajte vlastní PDF</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* PDF Upload */}
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-brand-yellow/50 hover:bg-white/[0.02] transition-colors relative">
                <input type="file" accept=".pdf" onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-brand-yellow" />
                    <div className="text-left">
                      <p className="text-white font-medium">{file.name}</p>
                      <p className="text-sm text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                    <p className="text-white font-medium">Nahrajte revizní zprávu (PDF)</p>
                    <p className="text-xs text-gray-500 mt-1">Klikněte nebo přetáhněte soubor</p>
                  </>
                )}
              </div>

              {/* Revision Result */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Výsledek revize</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'PASS', label: 'Bez závad', color: 'border-green-500/30 bg-green-500/5 text-green-500', active: 'border-green-500 bg-green-500/10' },
                    { value: 'PASS_WITH_NOTES', label: 'S výhradami', color: 'border-orange-500/30 bg-orange-500/5 text-orange-500', active: 'border-orange-500 bg-orange-500/10' },
                    { value: 'FAIL', label: 'Nevyhovuje', color: 'border-red-500/30 bg-red-500/5 text-red-500', active: 'border-red-500 bg-red-500/10' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setRevisionResult(opt.value)} className={cn("p-3 rounded-lg border text-sm font-medium transition-all", opt.color, revisionResult === opt.value && opt.active)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes with voice dictation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-400">Poznámky z revize</label>
                  <button
                    type="button"
                    onClick={() => isListening ? setIsListening(false) : startDictation(setRevisionNotes, revisionNotes)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      isListening ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {isListening ? <><MicOff className="w-3.5 h-3.5" /> Zastavit</> : <><Mic className="w-3.5 h-3.5" /> Diktovat</>}
                  </button>
                </div>
                <textarea value={revisionNotes} onChange={(e) => setRevisionNotes(e.target.value)} rows={3} placeholder="Zjištěné závady, doporučení... nebo klikněte na Diktovat" className="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-sm text-white focus:border-brand-yellow outline-none resize-none" />
              </div>

              {/* Next revision date */}
              <div>
                <label className="text-sm font-medium text-gray-400 mb-2 block">Další plánovaná revize</label>
                <input type="date" value={nextRevisionDate} onChange={(e) => setNextRevisionDate(e.target.value)} className="w-full bg-[#111] border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-brand-yellow outline-none" />
                <p className="text-xs text-gray-500 mt-1">Pokud nevyplníte, vypočítá se automaticky dle kategorie.</p>
              </div>

              {/* Confirmations */}
              <div className="space-y-3">
                <label onClick={() => setDefectsFixed(!defectsFixed)} className={cn("flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors", defectsFixed ? "border-green-500/30 bg-green-500/5" : "border-white/5 bg-[#111]")}>
                  <input type="checkbox" checked={defectsFixed} onChange={() => setDefectsFixed(!defectsFixed)} className="w-4 h-4 rounded border-gray-600 text-brand-yellow focus:ring-brand-yellow bg-transparent" />
                  <span className="text-sm text-gray-300">Zjištěné závady byly odstraněny na místě</span>
                </label>
                <label onClick={() => setSafeForUse(!safeForUse)} className={cn("flex items-center gap-3 p-3 rounded-lg cursor-pointer border transition-colors", safeForUse ? "border-green-500/30 bg-green-500/5" : "border-white/5 bg-[#111]")}>
                  <input type="checkbox" checked={safeForUse} onChange={() => setSafeForUse(!safeForUse)} className="w-4 h-4 rounded border-gray-600 text-brand-yellow focus:ring-brand-yellow bg-transparent" />
                  <span className="text-sm text-gray-300">Zařízení je schopné bezpečného provozu</span>
                </label>
              </div>

              {/* Submit */}
              <button onClick={handleComplete} disabled={isUploading || !file} className="w-full py-3 bg-brand-yellow text-black font-bold rounded-lg hover:bg-brand-yellow-hover transition-colors shadow-lg shadow-brand-yellow/10 flex items-center justify-center gap-2 disabled:opacity-50">
                {isUploading ? 'Nahrávání zprávy...' : <><CheckCircle2 className="w-5 h-5" /> Dokončit revizi a odeslat zprávu</>}
              </button>
            </div>
          ) : (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-8 text-center">
              <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">Nejprve zakázku přijměte a začněte na ní pracovat.</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-500 text-sm font-medium hover:bg-green-500/20 transition-colors">
                <Phone className="w-4 h-4" /> Zavolat
              </a>
            )}
            <a href={`https://maps.google.com/?q=${encodeURIComponent(order.confirmedAddress || order.address)}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-500 text-sm font-medium hover:bg-blue-500/20 transition-colors">
              <Navigation className="w-4 h-4" /> Navigovat
            </a>
          </div>

          <ChecklistSection orderId={order.id} isTechnician={true} />

          <PhotoSection orderId={order.id} isTechnician={isAssigned} />

          {/* Address History */}
          {addressHistory.length > 0 && (
            <div className="bg-[#1A1A1A] border border-white/5 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-brand-yellow" /> Historie na této adrese
              </h4>
              <div className="space-y-2">
                {addressHistory.map((h: any) => (
                  <div key={h.id} className="p-2.5 bg-[#111] rounded-lg border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">{h.serviceType}</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                        h.revisionResult === 'PASS' ? "bg-green-500/10 text-green-500" :
                        h.revisionResult === 'FAIL' ? "bg-red-500/10 text-red-500" : "bg-orange-500/10 text-orange-500"
                      )}>
                        {h.revisionResult === 'PASS' ? 'OK' : h.revisionResult === 'FAIL' ? 'FAIL' : 'VÝHRADY'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {h.completedAt ? new Date(h.completedAt).toLocaleDateString('cs-CZ') : '–'}
                      {h.technician?.name && ` · ${h.technician.name}`}
                    </p>
                    {h.revisionNotes && (
                      <p className="text-[10px] text-gray-400 mt-1 italic line-clamp-2">{h.revisionNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Chat */}
          <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
            <button onClick={() => setChatOpen(!chatOpen)} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-brand-yellow" />
                <span className="text-sm font-semibold text-white">Zprávy se zákazníkem</span>
              </div>
              {chatOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {chatOpen && (
              <div className="border-t border-white/5">
                <ChatSection orderId={order.id} currentUserId={currentUser.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
