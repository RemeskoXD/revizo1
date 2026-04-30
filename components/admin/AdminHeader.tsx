'use client';

import { User, ShieldAlert, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { NotificationBell } from '@/components/NotificationBell';
import { getRoleDisplayName } from '@/lib/role-labels';

interface AdminHeaderProps {
  onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
  const { data: session } = useSession();

  const userName = session?.user?.name || 'Admin';
  const userRole = getRoleDisplayName(session?.user?.role);

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#0a0a0a] pt-[env(safe-area-inset-top)]">
      <div className="flex min-h-14 flex-col gap-2 px-3 py-2.5 sm:px-4 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-4 lg:justify-start">
          <span className="truncate text-sm font-bold tracking-tight text-white sm:text-base lg:hidden">
            Revizone
          </span>
          <button
            type="button"
            onClick={onMenuClick}
            className="touch-manipulation shrink-0 rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Otevřít menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="hidden items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 lg:flex">
            <ShieldAlert className="h-3 w-3 shrink-0 text-red-500" />
            <span className="text-xs font-medium text-red-500">ADMINISTRÁTORSKÝ PŘÍSTUP</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 sm:gap-4 lg:ml-auto">
          <NotificationBell />

          <div className="mx-0.5 hidden h-8 w-px bg-white/10 sm:block" />

          <div className="flex min-w-0 items-center gap-2 pl-1 sm:gap-3 sm:pl-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-gray-500">{userRole}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-900/20">
              <User className="h-5 w-5 text-red-500" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
