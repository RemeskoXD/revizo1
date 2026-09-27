'use client';

import { useState, useEffect } from 'react';
import { User, ShieldAlert, Menu, Search, Sparkles } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { NotificationBell } from '@/components/NotificationBell';
import { getRoleDisplayName } from '@/lib/role-labels';
import { AdminCommandPalette } from './AdminCommandPalette';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { data: session } = useSession();
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  const userName = session?.user?.name || 'Admin';
  const userRole = getRoleDisplayName(session?.user?.role);

  useEffect(() => {
    const handleCustomOpen = () => setIsCommandOpen(true);
    window.addEventListener('open-admin-command', handleCustomOpen);
    return () => window.removeEventListener('open-admin-command', handleCustomOpen);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4 lg:h-16 lg:gap-4 lg:px-6">
          {/* Left section: mobile menu & admin badge */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onMenuClick}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
              aria-label="Otevřít menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <span className="truncate text-base font-bold tracking-tight text-white lg:hidden">
              Revizone
            </span>

            <div className="hidden items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 lg:flex">
              <ShieldAlert className="h-3 w-3 shrink-0 text-red-500" />
              <span className="text-xs font-semibold tracking-wider text-red-500">ADMINISTRACE</span>
            </div>
          </div>

          {/* Center search bar (Desktop & Tablet) */}
          <div className="flex-1 max-w-md mx-2 hidden sm:block">
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="flex h-10 w-full items-center justify-between rounded-xl border border-white/10 bg-[#141414] px-3.5 text-xs text-gray-400 transition-all hover:border-white/20 hover:bg-[#1a1a1a] hover:text-white"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="h-4 w-4 shrink-0 text-gray-400" />
                <span className="truncate">Hledat zakázky, uživatele, sekce...</span>
              </div>
              <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-gray-400 md:inline-flex">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right section: mobile search icon, bell, user info */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile search button (min 44px) */}
            <button
              type="button"
              onClick={() => setIsCommandOpen(true)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white sm:hidden"
              aria-label="Hledat"
            >
              <Search className="h-5 w-5" />
            </button>

            <NotificationBell />

            <div className="mx-0.5 hidden h-8 w-px bg-white/10 sm:block" />

            <div className="flex min-w-0 items-center gap-2 pl-1 sm:gap-3">
              <div className="hidden min-w-0 text-right sm:block">
                <p className="truncate text-sm font-semibold text-white">{userName}</p>
                <p className="truncate text-xs text-gray-400">{userRole}</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-900/20 text-red-500 font-bold text-xs">
                {(userName || 'A').charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Global Command Palette */}
      <AdminCommandPalette
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
      />
    </>
  );
}
