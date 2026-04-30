import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Briefcase, Users, FileText, DollarSign, Radio } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';
import { MobileSidebarToggle } from '@/components/MobileSidebarToggle';
import { RevizoneSidebarBrand } from '@/components/layout/RevizoneSidebarBrand';
import { SidebarFooterBlock } from '@/components/layout/SidebarFooterBlock';

export default async function CompanyLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'COMPANY_ADMIN') redirect('/login');

  return (
    <div className="flex min-h-dvh bg-black text-white">
      <MobileSidebarToggle>
        <div className="p-6">
          <RevizoneSidebarBrand href="/company" role={session.user.role} />
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Správa</p>
          <Link href="/company" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Briefcase className="w-4 h-4" /> Přehled
          </Link>
          <Link href="/company/orders" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <FileText className="w-4 h-4" /> Zakázky
          </Link>
          <Link href="/company/technicians" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Users className="w-4 h-4" /> Naši technici
          </Link>
          <Link href="/company/settlement" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <DollarSign className="w-4 h-4" /> Vyúčtování
          </Link>
          <Link href="/company/radar" className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
            <Radio className="w-4 h-4" /> Radar poptávek
          </Link>
        </nav>

        <SidebarFooterBlock settingsHref="/company/settings" />
      </MobileSidebarToggle>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-14 pr-14 pb-[env(safe-area-inset-bottom)] lg:pr-0 lg:pt-0">
        <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4 sm:py-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <PageTransition>
              {children}
            </PageTransition>
          </div>
        </div>
      </main>
    </div>
  );
}
