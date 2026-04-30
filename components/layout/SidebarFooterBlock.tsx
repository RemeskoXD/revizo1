'use client';

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { NotificationBell } from '@/components/NotificationBell';
import { LogoutButton } from '@/components/LogoutButton';
import { getRoleDisplayName } from '@/lib/role-labels';

type SidebarFooterBlockProps = {
  settingsHref: string;
};

export function SidebarFooterBlock({ settingsHref }: SidebarFooterBlockProps) {
  const { data: session } = useSession();
  const name = session?.user?.name;
  const email = session?.user?.email;
  const role = getRoleDisplayName(session?.user?.role);

  return (
    <div className="space-y-3 border-t border-white/10 p-4">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Oznámení</span>
        <NotificationBell />
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-gray-800 text-sm font-semibold text-white">
          {(name || email || '?').charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name || 'Uživatel'}</p>
          <p className="truncate text-xs text-gray-500">{email}</p>
          <p className="truncate text-[11px] text-brand-yellow/90">{role}</p>
        </div>
      </div>

      <Link
        href={settingsHref}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
      >
        <Settings className="h-4 w-4" /> Nastavení
      </Link>
      <LogoutButton />
    </div>
  );
}
