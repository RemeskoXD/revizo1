'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  X, 
  FileText, 
  Users, 
  ArrowRight, 
  LayoutDashboard, 
  DollarSign, 
  ShieldCheck, 
  Star, 
  Mail, 
  UserPlus, 
  UserCheck, 
  Building, 
  Activity, 
  Loader2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getRoleDisplayName } from '@/lib/role-labels';

interface SearchResultOrder {
  id: string;
  readableId: string;
  serviceType: string;
  address: string;
  status: string;
  customer?: { id: string; name: string | null; email: string | null; phone: string | null };
  technician?: { id: string; name: string | null; email: string | null };
}

interface SearchResultUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  address: string | null;
  ico: string | null;
  bannedAt: string | null;
}

const QUICK_PAGES = [
  { title: 'Přehled nástěnky', href: '/admin', icon: LayoutDashboard, category: 'Navigace' },
  { title: 'Správa objednávek', href: '/admin/orders', icon: FileText, category: 'Navigace' },
  { title: 'Správa uživatelů', href: '/admin/users', icon: Users, category: 'Navigace' },
  { title: 'Nové registrace', href: '/admin/registrations', icon: UserPlus, category: 'Navigace' },
  { title: 'Žádosti o roli', href: '/admin/roles', icon: UserCheck, category: 'Navigace' },
  { title: 'Přehled financí', href: '/admin/finances', icon: DollarSign, category: 'Navigace' },
  { title: 'Výplaty technikům', href: '/admin/payouts', icon: DollarSign, category: 'Navigace' },
  { title: 'Ceník produktů', href: '/admin/pricing', icon: DollarSign, category: 'Navigace' },
  { title: 'Revize – Evidence', href: '/admin/revisions', icon: ShieldCheck, category: 'Navigace' },
  { title: 'Hodnocení techniků', href: '/admin/ratings', icon: Star, category: 'Navigace' },
  { title: 'E-mailové logy', href: '/admin/emails', icon: Mail, category: 'Navigace' },
  { title: 'Podpora & Tikety', href: '/admin/support', icon: FileText, category: 'Navigace' },
  { title: 'Audit historie', href: '/admin/history', icon: Activity, category: 'Navigace' },
];

export function AdminCommandPalette({
  isOpen,
  onClose,
  onSelectOrder,
  onSelectUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectOrder?: (order: SearchResultOrder) => void;
  onSelectUser?: (user: SearchResultUser) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [orders, setOrders] = useState<SearchResultOrder[]>([]);
  const [users, setUsers] = useState<SearchResultUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setOrders([]);
      setUsers([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered from parent or event
          window.dispatchEvent(new CustomEvent('open-admin-command'));
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.trim().length < 2) {
      setOrders([]);
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setOrders(data.orders || []);
          setUsers(data.users || []);
        }
      } catch (err) {
        console.error('Command palette search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  // Filter quick pages based on query
  const filteredPages = query.trim()
    ? QUICK_PAGES.filter(p => p.title.toLowerCase().includes(query.toLowerCase()))
    : QUICK_PAGES.slice(0, 6);

  // Combine items for keyboard navigation
  const allItems: Array<
    | { type: 'page'; data: typeof QUICK_PAGES[0] }
    | { type: 'order'; data: SearchResultOrder }
    | { type: 'user'; data: SearchResultUser }
  > = [
    ...orders.map(o => ({ type: 'order' as const, data: o })),
    ...users.map(u => ({ type: 'user' as const, data: u })),
    ...filteredPages.map(p => ({ type: 'page' as const, data: p })),
  ];

  const handleSelect = (item: typeof allItems[0]) => {
    if (item.type === 'page') {
      router.push(item.data.href);
      onClose();
    } else if (item.type === 'order') {
      if (onSelectOrder) {
        onSelectOrder(item.data);
      } else {
        router.push(`/admin/orders?search=${item.data.readableId}`);
      }
      onClose();
    } else if (item.type === 'user') {
      if (onSelectUser) {
        onSelectUser(item.data);
      } else {
        router.push(`/admin/users?search=${encodeURIComponent(item.data.email || item.data.name || '')}`);
      }
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = allItems[selectedIndex];
      if (current) handleSelect(current);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 pt-12 sm:p-4 sm:pt-20">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#161616]/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Search Input Bar */}
            <div className="relative flex items-center border-b border-white/10 px-4 py-3.5 sm:px-5">
              {isLoading ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-brand-yellow" />
              ) : (
                <Search className="h-5 w-5 shrink-0 text-gray-400" />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Rychlé hledání zakázek (#ID), uživatelů, stránek..."
                className="ml-3.5 flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none sm:text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="hidden items-center gap-1.5 pl-3 sm:flex">
                <kbd className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results Area */}
            <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3">
              {/* Orders Section */}
              {orders.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Objednávky ({orders.length})
                  </div>
                  <div className="space-y-1">
                    {orders.map((order) => {
                      const itemIndex = allItems.findIndex(i => i.type === 'order' && (i.data as SearchResultOrder).id === order.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => handleSelect({ type: 'order', data: order })}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                            isSelected ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-yellow/15 text-brand-yellow">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-brand-yellow">#{order.readableId}</span>
                                <span className="truncate text-white font-medium">{order.serviceType}</span>
                              </div>
                              <p className="truncate text-xs text-gray-400">
                                {order.customer?.name || order.customer?.email || 'Neznámý'} · {order.address}
                              </p>
                            </div>
                          </div>
                          <span className="shrink-0 text-xs text-gray-500">
                            {order.status === 'COMPLETED' ? 'Dokončeno' : order.status === 'IN_PROGRESS' ? 'Probíhá' : 'Nová'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Users Section */}
              {users.length > 0 && (
                <div className="mb-3">
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Uživatelé ({users.length})
                  </div>
                  <div className="space-y-1">
                    {users.map((user) => {
                      const itemIndex = allItems.findIndex(i => i.type === 'user' && (i.data as SearchResultUser).id === user.id);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelect({ type: 'user', data: user })}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                            isSelected ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="truncate font-medium text-white">{user.name || user.email}</span>
                                <span className="text-[10px] text-gray-400">({getRoleDisplayName(user.role)})</span>
                              </div>
                              <p className="truncate text-xs text-gray-400">
                                {user.email} {user.phone ? `· ${user.phone}` : ''}
                              </p>
                            </div>
                          </div>
                          {user.bannedAt ? (
                            <span className="shrink-0 text-xs text-red-400 font-semibold">BAN</span>
                          ) : (
                            <ArrowRight className="h-4 w-4 shrink-0 text-gray-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quick Navigation Pages */}
              {filteredPages.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Rychlá navigace
                  </div>
                  <div className="space-y-1">
                    {filteredPages.map((page) => {
                      const itemIndex = allItems.findIndex(i => i.type === 'page' && (i.data as typeof QUICK_PAGES[0]).href === page.href);
                      const isSelected = itemIndex === selectedIndex;
                      const Icon = page.icon;
                      return (
                        <button
                          key={page.href}
                          type="button"
                          onClick={() => handleSelect({ type: 'page', data: page })}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                            isSelected ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-gray-300">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium">{page.title}</span>
                          </div>
                          <span className="text-xs text-gray-500">{page.href}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No results */}
              {query.trim().length >= 2 && orders.length === 0 && users.length === 0 && filteredPages.length === 0 && !isLoading && (
                <div className="p-8 text-center text-sm text-gray-500">
                  Žádné výsledky pro výraz „{query}“. Zkuste jiné klíčové slovo, ID nebo e-mail.
                </div>
              )}
            </div>

            {/* Bottom Keyboard Guide */}
            <div className="hidden items-center justify-between border-t border-white/5 bg-black/40 px-4 py-2 text-xs text-gray-500 sm:flex">
              <div className="flex items-center gap-3">
                <span>↑↓ navigace</span>
                <span>↵ potvrdit</span>
                <span>ESC zavřít</span>
              </div>
              <span className="text-[11px]">Revizone Admin v3</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
