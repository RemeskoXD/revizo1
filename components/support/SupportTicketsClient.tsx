'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FileText, Send, Paperclip, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

export function UserSupportClient({ currentUser }: { currentUser: any }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState('Dotaz / Nápověda');
  const [busy, setBusy] = useState(false);

  const fetchTickets = async () => {
    const res = await fetch('/api/support/tickets');
    if (res.ok) {
      setTickets(await res.json());
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, category: newCategory, messageText: newMessage })
      });
      if (!res.ok) throw new Error('Nepodařilo se vytvořit tiket');
      
      setIsCreating(false);
      setNewSubject('');
      setNewMessage('');
      fetchTickets();
      toast.success('Tiket byl vytvořen');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (selectedTicketId) {
    return <TicketDetailClient id={selectedTicketId} onBack={() => setSelectedTicketId(null)} currentUser={currentUser} />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white">Technická podpora</h1>
          <p className="text-gray-400 text-sm">Zde můžete komunikovat s naším týmem.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-brand-yellow text-black px-4 py-2 rounded-lg font-bold hover:bg-yellow-400 transition"
        >
          {isCreating ? 'Zrušit' : 'Nový tiket'}
        </button>
      </div>

      {isCreating && (
        <form onSubmit={handleCreate} className="bg-[#1A1A1A] border border-white/5 p-6 rounded-xl space-y-4">
          <h2 className="text-lg font-semibold text-white">Založit nový tiket</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
              <select 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)}
                className="w-full bg-[#111] text-white border border-white/10 rounded-lg px-4 py-2"
              >
                <option>Dotaz / Nápověda</option>
                <option>Problém s objednávkou</option>
                <option>Fakturace a výplaty</option>
                <option>Technická chyba</option>
                <option>Jiné</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Předmět *</label>
              <input 
                type="text" required
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                className="w-full bg-[#111] text-white border border-white/10 rounded-lg px-4 py-2"
                placeholder="Krátký popis problému"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Zpráva *</label>
            <textarea 
              required
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="w-full bg-[#111] text-white border border-white/10 rounded-lg px-4 py-2 min-h-[120px]"
              placeholder="Jak vám můžeme pomoci?"
            />
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={busy}
              className="bg-brand-yellow text-black font-bold px-6 py-2 rounded-lg hover:bg-yellow-400 disabled:opacity-50"
            >
              {busy ? 'Odesílám...' : 'Odeslat do podpory'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {tickets.map(ticket => (
          <div 
            key={ticket.id} 
            onClick={() => setSelectedTicketId(ticket.id)}
            className="cursor-pointer bg-[#1A1A1A] hover:bg-[#222] border border-white/5 rounded-xl p-5 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-md",
                  ticket.status === 'OPEN' ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                )}>
                  {ticket.status === 'OPEN' ? 'OTEVŘENÝ' : 'UZAVŘENÝ'}
                </span>
                <span className="text-xs text-gray-500">{new Date(ticket.createdAt).toLocaleDateString('cs-CZ')}</span>
              </div>
              <h3 className="text-white font-semibold">{ticket.subject}</h3>
              <p className="text-xs text-brand-yellow">{ticket.category}</p>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <span>{ticket._count?.messages || 0} zpráv</span>
              <span className="hidden sm:inline">&rarr;</span>
            </div>
          </div>
        ))}
        {tickets.length === 0 && !isCreating && (
          <div className="text-center text-gray-500 py-10">Zatím jste nezaložili žádný tiket.</div>
        )}
      </div>
    </div>
  );
}

function TicketDetailClient({ id, onBack, currentUser }: { id: string, onBack: () => void, currentUser: any }) {
  const [ticket, setTicket] = useState<any>(null);
  const [text, setText] = useState('');
  const [attachmentData, setAttachmentData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      const res = await fetch(`/api/support/tickets/${id}`);
      if (res.ok) setTicket(await res.json());
    };
    fetchDetail();
    
    const interval = setInterval(fetchDetail, 10000); // Polling every 10s
    return () => clearInterval(interval);
  }, [id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    
    try {
      const { compressImage, fileToBase64 } = await import('@/lib/client-compress');
      const compressed = await compressImage(file);
      const b64 = await fileToBase64(compressed);
      setAttachmentData(b64);
    } catch (err) {
      console.error(err);
      toast.error('Při zpracování souboru došlo k chybě.');
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!text.trim() && !attachmentData) || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, attachmentUrl: attachmentData, fileName }),
      });
      if (!res.ok) throw new Error('Nepodařilo se odeslat zprávu');
      
      const newMsg = await res.json();
      setTicket((prev: any) => ({ ...prev, messages: [...prev.messages, newMsg] }));
      setText('');
      setAttachmentData(null);
      setFileName(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const closeTicket = async () => {
    if (!confirm('Opravdu chcete uzavřít tento tiket?')) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' }),
      });
      if (!res.ok) throw new Error('Nepodařilo se uzavřít tiket');
      setTicket((prev: any) => ({ ...prev, status: 'CLOSED' }));
      toast.success('Tiket uzavřen');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) return <div className="text-center py-10 text-gray-500">Načítám...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/10 shrink-0">
        <button onClick={onBack} className="p-2 bg-[#1A1A1A] hover:bg-[#222] rounded-lg text-gray-400 transition">
          &larr; Zpět
        </button>
        <div className="flex-1">
          <div className="text-xl font-bold text-white leading-tight">{ticket.subject}</div>
          <div className="text-xs text-gray-500">
            {ticket.category} • Založeno {new Date(ticket.createdAt).toLocaleString('cs-CZ')}
            {ticket.user && (currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPPORT') && ` • Uživatel: ${ticket.user.name}`}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn(
            "text-xs font-bold px-2 py-1 rounded-md",
            ticket.status === 'OPEN' ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
          )}>
            {ticket.status}
          </span>
          {ticket.status === 'OPEN' && (
            <button 
              onClick={closeTicket} 
              disabled={busy}
              className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-md font-semibold transition disabled:opacity-50"
            >
              Uzavřít
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {ticket.messages.map((msg: any) => {
          const isMe = msg.senderId === currentUser.id;
          const isAdminMsg = msg.sender?.role === 'ADMIN' || msg.sender?.role === 'SUPER_ADMIN' || msg.sender?.role === 'SUPPORT';
          
          return (
            <div key={msg.id} className={cn("flex flex-col max-w-[80%]", isMe ? "ml-auto" : "mr-auto")}>
              <div className="text-[10px] text-gray-500 mb-1 px-1 flex gap-2">
                <span className="font-semibold text-gray-400">{isMe ? 'Vy' : (isAdminMsg ? 'Podpora' : msg.sender?.name)}</span>
                <span>{new Date(msg.createdAt).toLocaleString('cs-CZ')}</span>
              </div>
              <div className={cn(
                "p-3 rounded-2xl",
                isMe ? "bg-brand-yellow text-black rounded-tr-sm" : "bg-[#1A1A1A] text-white border border-white/5 rounded-tl-sm",
                isAdminMsg && !isMe ? "bg-blue-500/10 border-blue-500/20 text-blue-100" : ""
              )}>
                {msg.text && <p className="whitespace-pre-wrap text-sm">{msg.text}</p>}
                
                {msg.attachmentUrl && (
                  <div className="mt-2">
                    {msg.attachmentUrl.startsWith('data:image') ? (
                      <button 
                        onClick={() => setViewingPhoto(msg.attachmentUrl)}
                        className="block cursor-pointer outline-none"
                      >
                        <img src={msg.attachmentUrl} alt="Příloha" className="max-h-60 rounded-md border border-black/10 hover:opacity-90 transition-opacity" />
                      </button>
                    ) : (
                      <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-black/20 rounded-lg hover:bg-black/30 text-sm">
                        <FileText size={16} />
                        <span className="truncate">{msg.fileName || 'Příloha'}</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {ticket.messages.length === 0 && <div className="text-center py-10 text-gray-500">Zatím žádné zprávy.</div>}
      </div>

      {ticket.status === 'OPEN' ? (
        <form onSubmit={handleSend} className="shrink-0 bg-[#1A1A1A] border border-white/5 p-3 rounded-xl flex gap-3 items-end">
          <label className="p-3 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer transition shrink-0">
            <input type="file" className="hidden" onChange={handleFileChange} />
            <Paperclip size={20} />
          </label>
          <div className="flex-1">
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-brand-yellow bg-brand-yellow/10 px-3 py-1.5 rounded-lg mb-2 inline-flex">
                <FileText size={14} /> <span className="truncate max-w-[200px]">{fileName}</span>
                <button type="button" onClick={() => { setAttachmentData(null); setFileName(null); }} className="hover:text-white"><X size={14} /></button>
              </div>
            )}
            <textarea
              rows={1}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Napište zprávu..."
              className="w-full bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-yellow resize-none max-h-32 min-h-[48px]"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          <button 
            type="submit" 
            disabled={busy || (!text.trim() && !attachmentData)}
            className="p-3 bg-brand-yellow text-black rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition shrink-0 flex items-center justify-center"
          >
            <Send size={20} />
          </button>
        </form>
      ) : (
        <div className="shrink-0 text-center p-4 bg-[#1A1A1A] border border-white/5 rounded-xl text-gray-500">
          Tento tiket byl uzavřen.
        </div>
      )}
      
      {viewingPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setViewingPhoto(null)}>
          <button className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <img src={viewingPhoto} alt="Photo detail" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export function AdminSupportClient({ tickets: initialTickets, currentUser }: { tickets: any[], currentUser: any }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'CANCELLATIONS' | 'OPEN' | 'CLOSED'>('ALL');

  if (selectedTicketId) {
    return <TicketDetailClient id={selectedTicketId} onBack={() => setSelectedTicketId(null)} currentUser={currentUser} />;
  }

  const openCancellationsCount = tickets.filter(
    t => (t.category === 'ORDER_CANCELLATION' || t.subject?.toLowerCase().includes('storno')) && t.status === 'OPEN'
  ).length;

  const filteredTickets = tickets.filter(t => {
    const isCancel = t.category === 'ORDER_CANCELLATION' || t.subject?.toLowerCase().includes('storno');
    if (filter === 'CANCELLATIONS') return isCancel;
    if (filter === 'OPEN') return t.status === 'OPEN';
    if (filter === 'CLOSED') return t.status === 'CLOSED';
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-sans text-white">Zákaznická podpora</h1>
          <p className="text-gray-400 text-sm">Tikety od všech uživatelů a žádosti o storno zakázek.</p>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1.5 bg-[#111] p-1 rounded-xl border border-white/10 text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === 'ALL' ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-white"
            )}
          >
            Vše ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('CANCELLATIONS')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5",
              filter === 'CANCELLATIONS' ? "bg-red-500/20 text-red-300 font-semibold border border-red-500/30" : "text-red-400 hover:text-red-300"
            )}
          >
            <span>Storna</span>
            {openCancellationsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white font-bold text-[10px]">
                {openCancellationsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter('OPEN')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === 'OPEN' ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-white"
            )}
          >
            Otevřené
          </button>
          <button
            type="button"
            onClick={() => setFilter('CLOSED')}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === 'CLOSED' ? "bg-white/10 text-white font-semibold" : "text-gray-400 hover:text-white"
            )}
          >
            Uzavřené
          </button>
        </div>
      </div>

      <div className="bg-[#1A1A1A] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-[#111] text-gray-400 text-xs uppercase border-b border-white/5">
            <tr>
              <th className="px-4 py-3">Uživatel</th>
              <th className="px-4 py-3">Předmět / Kategorie</th>
              <th className="px-4 py-3">Stav</th>
              <th className="px-4 py-3">Založeno</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTickets.map(ticket => {
              const isCancellation = ticket.category === 'ORDER_CANCELLATION' || ticket.subject?.toLowerCase().includes('storno');
              return (
                <tr 
                  key={ticket.id} 
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={cn(
                    "transition-colors cursor-pointer",
                    isCancellation
                      ? "bg-red-500/[0.04] hover:bg-red-500/[0.08]"
                      : "hover:bg-white/[0.02]"
                  )}
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-white">{ticket.user?.name || 'Neznámý'}</div>
                    <div className="text-xs text-gray-500">{ticket.user?.email} • {ticket.user?.role}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-200">{ticket.subject}</span>
                      {isCancellation && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          Storno zakázky
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-brand-yellow mt-1">{ticket.category}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      ticket.status === 'OPEN' ? "bg-green-500/10 text-green-400" : "bg-gray-500/10 text-gray-400"
                    )}>
                      {ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {new Date(ticket.createdAt).toLocaleDateString('cs-CZ')}
                  </td>
                </tr>
              );
            })}
            {filteredTickets.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                  Nebyly nalezeny žádné odpovídající tikety.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
