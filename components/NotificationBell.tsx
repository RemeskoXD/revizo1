'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { PexesoMemoryGame } from '@/components/PexesoMemoryGame';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

const BELL_TAP_WINDOW_MS = 1800;
const BELL_TAPS_FOR_EASTER_EGG = 6;

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pexesoOpen, setPexesoOpen] = useState(false);
  const bellTapCountRef = useRef(0);
  const bellTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/user/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
        setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
      }
    } catch {}
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' }),
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await fetch('/api/user/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', notificationId: notif.id }),
      });
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.link) {
      setIsOpen(false);
      router.push(notif.link);
    }
  };

  const handleBellButtonClick = () => {
    if (bellTapTimerRef.current) clearTimeout(bellTapTimerRef.current);
    bellTapCountRef.current += 1;
    bellTapTimerRef.current = setTimeout(() => {
      bellTapCountRef.current = 0;
    }, BELL_TAP_WINDOW_MS);

    if (bellTapCountRef.current >= BELL_TAPS_FOR_EASTER_EGG) {
      bellTapCountRef.current = 0;
      if (bellTapTimerRef.current) clearTimeout(bellTapTimerRef.current);
      setIsOpen(false);
      setPexesoOpen(true);
      return;
    }

    setIsOpen((o) => !o);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'právě teď';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleBellButtonClick}
        className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5"
        aria-label="Upozornění"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-[#111]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <PexesoMemoryGame open={pexesoOpen} onClose={() => setPexesoOpen(false)} />

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-white/5 flex items-center justify-between">
              <h3 className="font-semibold text-white text-sm">Upozornění</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-brand-yellow hover:underline flex items-center gap-1">
                  <Check className="w-3 h-3" /> Přečíst vše
                </button>
              )}
            </div>
            <div className="max-h-[350px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center">
                  <Bell className="w-6 h-6 text-gray-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Žádná upozornění</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button key={n.id} onClick={() => handleClick(n)} className={cn(
                    "w-full text-left p-3 border-b border-white/5 hover:bg-white/5 transition-colors",
                    !n.isRead && "bg-brand-yellow/5"
                  )}>
                    <div className="flex items-start gap-2">
                      {!n.isRead && <div className="w-2 h-2 bg-brand-yellow rounded-full mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn("text-xs font-medium truncate", n.isRead ? "text-gray-400" : "text-white")}>{n.title}</p>
                          <span className="text-[10px] text-gray-600 shrink-0">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      </div>
                      {n.link && <ExternalLink className="w-3 h-3 text-gray-600 shrink-0 mt-1" />}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
