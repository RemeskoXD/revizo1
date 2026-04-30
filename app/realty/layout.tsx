import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Building2, Home, Send } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { MobileSidebarToggle } from '@/components/MobileSidebarToggle';
import { RevizoneSidebarBrand } from '@/components/layout/RevizoneSidebarBrand';
import { SidebarFooterBlock } from '@/components/layout/SidebarFooterBlock';

export default async function RealtyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'REALTY') redirect('/login');

  return (
    <div className="flex min-h-dvh bg-black text-white">
      <MobileSidebarToggle>
        <div className="p-6">
          <RevizoneSidebarBrand href="/realty" role={session.user.role} />
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Správa</p>
          <Link href="/realty" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <Building2 className="h-4 w-4" /> Přehled
          </Link>
          <Link href="/realty/properties" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <Home className="h-4 w-4" /> Nemovitosti
          </Link>
          <Link href="/realty/transfers" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white">
            <Send className="h-4 w-4" /> Převody
          </Link>
        </nav>

        <SidebarFooterBlock settingsHref="/realty/settings" />
      </MobileSidebarToggle>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 pr-14 pb-[env(safe-area-inset-bottom)] lg:pr-0 lg:pt-0">
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
          <div className="mx-auto max-w-7xl">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
