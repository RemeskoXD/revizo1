'use client';

import { Search, User, Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { NotificationBell } from '@/components/NotificationBell';
import { getRoleDisplayName } from '@/lib/role-labels';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const userName = session?.user?.name || 'Uživatel';
  const userRole = getRoleDisplayName(session?.user?.role);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/dashboard/orders?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const searchInput = (
    <>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 w-4 h-4 -translate-y-1/2 text-gray-500" />
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Hledat v objednávkách…"
        enterKeyHint="search"
        className="w-full rounded-full border border-white/10 bg-[#1A1A1A] py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 transition-colors focus:border-brand-yellow/50 focus:outline-none"
      />
    </>
  );

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-white/10 bg-[#111111] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-6 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 sm:gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <span className="truncate text-sm font-bold tracking-tight text-white sm:text-base lg:hidden">
              Revizone
            </span>
            <form onSubmit={handleSearch} className="relative hidden min-w-0 max-w-md flex-1 lg:block">
              {searchInput}
            </form>
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

        <div className="flex items-center justify-end gap-2 sm:gap-4 lg:shrink-0">
          <NotificationBell />

          <div className="mx-0.5 hidden h-8 w-px bg-white/10 sm:block" />

          <div className="flex min-w-0 items-center gap-2 pl-1 sm:gap-3 sm:pl-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-medium text-white">{userName}</p>
              <p className="truncate text-xs text-gray-500">{userRole}</p>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gray-800">
              <User className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={handleSearch}
        className="relative border-t border-white/5 px-3 pb-3 lg:hidden"
      >
        {searchInput}
      </form>
    </header>
  );
}
