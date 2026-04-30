'use client';

import { useState } from 'react';
import { TechnicianSidebar } from '@/components/technician/TechnicianSidebar';
import { TechnicianHeader } from '@/components/technician/TechnicianHeader';
import { PageTransition } from '@/components/PageTransition';

export default function TechnicianShell({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[#111111]">
      <TechnicianSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <TechnicianHeader onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] pr-14 sm:px-4 sm:py-5 md:p-6 lg:pr-6">
          <div className="max-w-7xl mx-auto">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
    </div>
  );
}
