'use client';

import Link from 'next/link';
import { LayoutDashboard, ClipboardList, MessageSquare, User, DollarSign, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { RevizoneSidebarBrand } from '@/components/layout/RevizoneSidebarBrand';
import { SidebarFooterBlock } from '@/components/layout/SidebarFooterBlock';
import { SidebarResizeHandle } from '@/components/layout/SidebarResizeHandle';

const navigation = [
  { name: 'Přehled', href: '/technician', icon: LayoutDashboard },
  { name: 'Moje zakázky', href: '/technician/queue', icon: ClipboardList },
  { name: 'Výdělky', href: '/technician/earnings', icon: DollarSign },
  { name: 'Zprávy', href: '/technician/messages', icon: MessageSquare },
  { name: 'Profil', href: '/technician/profile', icon: User },
];

interface TechnicianSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function TechnicianSidebar({ isOpen, onClose }: TechnicianSidebarProps) {
  const { data: session } = useSession();
  const { sidebarWidth, isLg, startResize } = useSidebarWidth();

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/80 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
        aria-hidden
      />

      <div
        className="relative z-50 shrink-0 self-stretch lg:flex lg:h-full lg:min-h-0 lg:flex-col"
        style={isLg ? ({ width: sidebarWidth } as React.CSSProperties) : undefined}
      >
        <div
          className={cn(
            'relative flex h-full min-h-0 w-[min(18rem,88vw)] flex-col border-r border-white/10 bg-[#1A1A1A] transition-transform duration-300',
            'fixed inset-y-0 left-0 pt-[env(safe-area-inset-top)] lg:relative lg:w-full lg:max-w-none lg:pt-0',
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <SidebarResizeHandle onMouseDown={startResize} />

          <div className="flex min-h-14 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 sm:px-6">
            <div className="min-w-0 py-3" onClick={onClose}>
              <RevizoneSidebarBrand href="/technician" role={session?.user?.role} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 touch-manipulation rounded-lg p-2 text-gray-400 hover:text-white lg:hidden"
              aria-label="Zavřít menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
            <div className="space-y-1">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Menu</p>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    'text-gray-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon className="h-5 w-5 transition-colors group-hover:text-brand-yellow" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto shrink-0 pt-5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <SidebarFooterBlock settingsHref="/dashboard/settings" />
          </div>
        </div>
      </div>
    </>
  );
}
