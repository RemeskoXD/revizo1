'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const NEAR_BOTTOM_PX = 80;

export function ChatSection({ orderId, currentUserId }: { orderId: string, currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const updateNearBottom = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  useEffect(() => {
    fetchMessages();
    // Optional: Set up polling for new messages
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateNearBottom, { passive: true });
    return () => el.removeEventListener('scroll', updateNearBottom);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const lastFromMe = last?.senderId === currentUserId;
    if (lastFromMe || isNearBottomRef.current) {
      requestAnimationFrame(() => {
        const box = scrollContainerRef.current;
        if (box) box.scrollTop = box.scrollHeight;
      });
    }
  }, [messages, currentUserId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/orders/${orderId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage;
    setNewMessage('');

    // Optimistic update
    const tempMessage = {
      id: Date.now().toString(),
      content,
      senderId: currentUserId,
      createdAt: new Date().toISOString(),
      sender: { name: 'Já', role: 'CURRENT' }
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => prev.map(msg => msg.id === tempMessage.id ? savedMessage : msg));
      } else {
        // Revert on failure
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
        alert('Chyba při odesílání zprávy.');
      }
    } catch (error) {
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      alert('Chyba při odesílání zprávy.');
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center text-gray-500">Načítání zpráv...</div>;
  }

  return (
    <div className="flex h-full min-h-[240px] flex-col overflow-hidden rounded-xl border border-white/5 bg-[#1A1A1A] sm:min-h-[320px]">
      <div className="p-4 border-b border-white/5 bg-[#111]">
        <h3 className="text-sm font-semibold text-white">Komunikace k zakázce</h3>
      </div>
      
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 text-sm mt-10">
            Zatím žádné zprávy. Napište první zprávu.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id} className={cn("flex gap-3", isMe ? "flex-row-reverse" : "flex-row")}>
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  isMe ? "bg-brand-yellow text-black rounded-tr-none" : "bg-[#222] text-white rounded-tl-none"
                )}>
                  {!isMe && <div className="text-xs text-gray-400 mb-1">{msg.sender?.name || 'Uživatel'}</div>}
                  <div className="text-sm break-words">{msg.content}</div>
                  <div className={cn("text-[10px] mt-1 text-right", isMe ? "text-black/60" : "text-gray-500")}>
                    {new Date(msg.createdAt).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={sendMessage} className="p-3 border-t border-white/5 bg-[#111] flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Napište zprávu..."
          className="flex-1 bg-[#222] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-yellow/50"
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className="p-2 bg-brand-yellow text-black rounded-lg hover:bg-brand-yellow-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
