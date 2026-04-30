'use client';

import { User, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { NotificationBell } from '@/components/NotificationBell';
import { getRoleDisplayName } from '@/lib/role-labels';

interface TechnicianHeaderProps {
  onMenuClick?: () => void;
}

export function TechnicianHeader({ onMenuClick }: TechnicianHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#111111] pt-[env(safe-area-inset-top)]">
      <div className="flex h-auto min-h-14 items-center justify-between gap-2 px-3 py-2.5 sm:px-4 lg:h-16 lg:px-6 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4 lg:justify-start">
          <div className="min-w-0 lg:flex lg:items-center lg:gap-3">
            <span className="block truncate text-sm font-bold tracking-tight text-white sm:text-base lg:hidden">
              Revizone
            </span>
            <h2 className="hidden font-mono text-xs text-gray-500 sm:text-sm lg:block">
              PARTNER PORTAL
            </h2>
          </div>
          <button
            type="button"
            onClick={onMenuClick}
            className="touch-manipulation shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Otevřít menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <NotificationBell />

          <div className="mx-0.5 hidden h-8 w-px bg-white/10 sm:block" />

          <div className="flex min-w-0 items-center gap-2 pl-1 sm:gap-3 sm:pl-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-white">{session?.user?.name || 'Technik'}</p>
              <p className="truncate text-xs text-gray-500">{getRoleDisplayName(session?.user?.role)}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gray-800">
              <User className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
