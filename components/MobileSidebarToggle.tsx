'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarWidth } from '@/hooks/useSidebarWidth';
import { SidebarResizeHandle } from '@/components/layout/SidebarResizeHandle';

export function MobileSidebarToggle({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { sidebarWidth, isLg, startResize } = useSidebarWidth();

  return (
    <div
      className="relative shrink-0 lg:flex lg:h-full lg:min-h-0 lg:min-w-0 lg:flex-col"
      style={isLg ? ({ width: sidebarWidth } as React.CSSProperties) : undefined}
    >
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30 touch-manipulation rounded-lg border border-white/10 bg-[#1A1A1A] p-2.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
        aria-label="Otevřít menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/80 transition-opacity duration-300 lg:hidden',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'z-50 flex h-full min-h-dvh flex-col border-r border-white/5 bg-[#111]',
          'fixed inset-y-0 left-0 transition-transform duration-300 pt-[env(safe-area-inset-top)]',
          'w-[min(18rem,88vw)] max-w-[88vw] lg:w-full lg:max-w-none',
          'lg:relative lg:translate-x-0 lg:pt-0',
          isOpen ? 'flex translate-x-0' : '-translate-x-full hidden lg:flex lg:translate-x-0'
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-[max(0.75rem,env(safe-area-inset-top))] touch-manipulation text-gray-400 transition-colors hover:text-white lg:hidden"
          aria-label="Zavřít menu"
        >
          <X className="h-5 w-5" />
        </button>

        <SidebarResizeHandle onMouseDown={startResize} />

        <div
          className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
          onClick={() => setIsOpen(false)}
        >
          {children}
        </div>
      </aside>
    </div>
  );
}
